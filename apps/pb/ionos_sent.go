package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/textproto"
	"os"
	"strconv"
	"strings"
	"time"

	imap "github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
)

const (
	defaultIONOSIMAPPort        = 993
	defaultIONOSSentMailbox     = "Sent"
	defaultIONOSIMAPDialTimeout = 15 * time.Second
)

type sentEmailArchiver interface {
	Append(context.Context, ResendEmailRequest, string) error
}

type ionosSentArchiver struct {
	host     string
	port     int
	username string
	password string
	mailbox  string
	dial     func(context.Context, string, *tls.Config) (*client.Client, error)
}

func newIONOSSentArchiverFromEnv() sentEmailArchiver {
	host := strings.TrimSpace(os.Getenv("IONOS_IMAP_HOST"))
	username := strings.TrimSpace(os.Getenv("IONOS_IMAP_USERNAME"))
	password := strings.TrimSpace(os.Getenv("IONOS_IMAP_PASSWORD"))
	portValue := strings.TrimSpace(os.Getenv("IONOS_IMAP_PORT"))
	mailbox := strings.TrimSpace(os.Getenv("IONOS_IMAP_SENT_MAILBOX"))

	// Sent-folder syncing is optional. This permits deploying the code before the
	// mailbox credentials are added without affecting Resend delivery.
	if host == "" && username == "" && password == "" && portValue == "" && mailbox == "" {
		return nil
	}

	if host == "" || username == "" || password == "" {
		fmt.Println("WARN: IONOS Sent append disabled: IONOS_IMAP_HOST, IONOS_IMAP_USERNAME, and IONOS_IMAP_PASSWORD must all be set")
		return nil
	}

	port := defaultIONOSIMAPPort
	if portValue != "" {
		parsed, err := strconv.Atoi(portValue)
		if err != nil || parsed < 1 || parsed > 65535 {
			fmt.Printf("WARN: IONOS Sent append disabled: invalid IONOS_IMAP_PORT %q\n", portValue)
			return nil
		}
		port = parsed
	}
	if mailbox == "" {
		mailbox = defaultIONOSSentMailbox
	}

	return &ionosSentArchiver{
		host:     host,
		port:     port,
		username: username,
		password: password,
		mailbox:  mailbox,
		dial:     dialIMAPTLS,
	}
}

func dialIMAPTLS(ctx context.Context, address string, config *tls.Config) (*client.Client, error) {
	dialer := &tls.Dialer{
		NetDialer: &net.Dialer{Timeout: defaultIONOSIMAPDialTimeout},
		Config:    config,
	}
	connection, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return nil, err
	}
	if err := connection.SetDeadline(time.Now().Add(defaultIONOSIMAPDialTimeout)); err != nil {
		_ = connection.Close()
		return nil, err
	}

	c, err := client.New(connection)
	if err != nil {
		_ = connection.Close()
		return nil, err
	}
	return c, nil
}

func (a *ionosSentArchiver) Append(ctx context.Context, request ResendEmailRequest, messageID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	address := net.JoinHostPort(a.host, strconv.Itoa(a.port))
	c, err := a.dial(ctx, address, &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: a.host,
	})
	if err != nil {
		return fmt.Errorf("connect to IMAP: %w", err)
	}
	defer c.Logout() //nolint:errcheck -- best effort cleanup after the result is known

	if err := c.Login(a.username, a.password); err != nil {
		return fmt.Errorf("login to IMAP: %w", err)
	}
	if _, err := c.Select(a.mailbox, false); err != nil {
		return fmt.Errorf("select Sent mailbox %q: %w", a.mailbox, err)
	}

	criteria := imap.NewSearchCriteria()
	criteria.Header.Set("Message-ID", messageID)
	ids, err := c.Search(criteria)
	if err != nil {
		return fmt.Errorf("check Sent mailbox for duplicate: %w", err)
	}
	if len(ids) > 0 {
		return nil
	}

	message, err := buildSentMIME(request, messageID, time.Now())
	if err != nil {
		return err
	}
	flags := []string{imap.SeenFlag}
	if err := c.Append(a.mailbox, flags, time.Now(), bytes.NewReader(message)); err != nil {
		return fmt.Errorf("append to Sent mailbox %q: %w", a.mailbox, err)
	}
	return nil
}

func sentMessageID(resendID, idempotencyKey string, request ResendEmailRequest) string {
	seed := strings.TrimSpace(resendID)
	if seed == "" {
		seed = strings.TrimSpace(idempotencyKey)
	}
	if seed == "" {
		seed = request.From + "\x00" + strings.Join(request.To, ",") + "\x00" + request.Subject + "\x00" + request.HTML + "\x00" + request.Text
	}
	sum := sha256.Sum256([]byte(seed))
	return fmt.Sprintf("<resend-%x@updates.preciouspetals.co.uk>", sum[:16])
}

func buildSentMIME(request ResendEmailRequest, messageID string, sentAt time.Time) ([]byte, error) {
	var output bytes.Buffer
	writeHeader(&output, "From", request.From)
	writeHeader(&output, "To", strings.Join(request.To, ", "))
	writeHeader(&output, "Subject", mime.QEncoding.Encode("UTF-8", request.Subject))
	writeHeader(&output, "Date", sentAt.Format(time.RFC1123Z))
	writeHeader(&output, "Message-ID", messageID)
	writeHeader(&output, "MIME-Version", "1.0")
	if request.ReplyTo != "" {
		writeHeader(&output, "Reply-To", request.ReplyTo)
	}

	attachments, err := decodeResendAttachments(request.Attachments)
	if err != nil {
		return nil, err
	}

	if len(attachments) == 0 {
		if err := writeAlternativeBody(&output, request.Text, request.HTML); err != nil {
			return nil, err
		}
		return output.Bytes(), nil
	}

	mixed := multipart.NewWriter(&output)
	writeHeader(&output, "Content-Type", fmt.Sprintf("multipart/mixed; boundary=%q", mixed.Boundary()))
	output.WriteString("\r\n")

	bodyHeader := make(textproto.MIMEHeader)
	bodyBuffer := new(bytes.Buffer)
	if err := writeAlternativeBody(bodyBuffer, request.Text, request.HTML); err != nil {
		return nil, err
	}
	bodyContentType, body, ok := bytes.Cut(bodyBuffer.Bytes(), []byte("\r\n\r\n"))
	if !ok {
		return nil, errors.New("build MIME body: missing header separator")
	}
	for _, line := range bytes.Split(bodyContentType, []byte("\r\n")) {
		if key, value, found := bytes.Cut(line, []byte(":")); found {
			bodyHeader.Set(string(key), strings.TrimSpace(string(value)))
		}
	}
	bodyPart, err := mixed.CreatePart(bodyHeader)
	if err != nil {
		return nil, fmt.Errorf("create MIME body: %w", err)
	}
	if _, err := bodyPart.Write(body); err != nil {
		return nil, fmt.Errorf("write MIME body: %w", err)
	}

	for _, attachment := range attachments {
		if err := writeMIMEAttachment(mixed, attachment); err != nil {
			return nil, err
		}
	}
	if err := mixed.Close(); err != nil {
		return nil, fmt.Errorf("close MIME message: %w", err)
	}
	return output.Bytes(), nil
}

type decodedAttachment struct {
	ResendAttachment
	data []byte
}

func decodeResendAttachments(values []ResendAttachment) ([]decodedAttachment, error) {
	result := make([]decodedAttachment, 0, len(values))
	for _, value := range values {
		if value.Path != "" && value.Content == "" {
			return nil, fmt.Errorf("archive attachment %q: URL attachments are not supported", value.Filename)
		}
		data, err := base64.StdEncoding.DecodeString(value.Content)
		if err != nil {
			return nil, fmt.Errorf("decode attachment %q: %w", value.Filename, err)
		}
		result = append(result, decodedAttachment{ResendAttachment: value, data: data})
	}
	return result, nil
}

func writeAlternativeBody(output io.Writer, textBody, htmlBody string) error {
	if textBody == "" || htmlBody == "" {
		contentType, body := "text/plain", textBody
		if htmlBody != "" {
			contentType, body = "text/html", htmlBody
		}
		fmt.Fprintf(output, "Content-Type: %s; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n", contentType)
		return writeBase64(output, []byte(body))
	}

	alternative := multipart.NewWriter(output)
	fmt.Fprintf(output, "Content-Type: multipart/alternative; boundary=%q\r\n\r\n", alternative.Boundary())
	for _, body := range []struct{ contentType, value string }{{"text/plain", textBody}, {"text/html", htmlBody}} {
		header := make(textproto.MIMEHeader)
		header.Set("Content-Type", body.contentType+"; charset=UTF-8")
		header.Set("Content-Transfer-Encoding", "base64")
		part, err := alternative.CreatePart(header)
		if err != nil {
			return err
		}
		if err := writeBase64(part, []byte(body.value)); err != nil {
			return err
		}
	}
	return alternative.Close()
}

func writeMIMEAttachment(writer *multipart.Writer, attachment decodedAttachment) error {
	header := make(textproto.MIMEHeader)
	contentType := attachment.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	disposition := attachment.ContentDisposition
	if disposition == "" {
		disposition = "attachment"
	}
	header.Set("Content-Type", contentType+"; name="+strconv.Quote(attachment.Filename))
	header.Set("Content-Disposition", disposition+"; filename="+strconv.Quote(attachment.Filename))
	header.Set("Content-Transfer-Encoding", "base64")
	if attachment.ContentID != "" {
		header.Set("Content-ID", "<"+strings.Trim(attachment.ContentID, "<>")+">")
	}
	part, err := writer.CreatePart(header)
	if err != nil {
		return fmt.Errorf("create attachment %q: %w", attachment.Filename, err)
	}
	if err := writeBase64(part, attachment.data); err != nil {
		return fmt.Errorf("write attachment %q: %w", attachment.Filename, err)
	}
	return nil
}

func writeBase64(output io.Writer, data []byte) error {
	encoded := base64.StdEncoding.EncodeToString(data)
	for len(encoded) > 76 {
		if _, err := io.WriteString(output, encoded[:76]+"\r\n"); err != nil {
			return err
		}
		encoded = encoded[76:]
	}
	_, err := io.WriteString(output, encoded+"\r\n")
	return err
}

func writeHeader(output io.Writer, name, value string) {
	value = strings.ReplaceAll(strings.ReplaceAll(value, "\r", ""), "\n", "")
	fmt.Fprintf(output, "%s: %s\r\n", name, value)
}
