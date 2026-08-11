package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/mail"
	"strings"
	"testing"
	"time"
)

type recordingSentArchiver struct {
	request   ResendEmailRequest
	messageID string
	err       error
	calls     int
}

func (a *recordingSentArchiver) Append(_ context.Context, request ResendEmailRequest, messageID string) error {
	a.calls++
	a.request = request
	a.messageID = messageID
	return a.err
}

func TestBuildSentMIMEPreservesBodiesAndAttachments(t *testing.T) {
	request := ResendEmailRequest{
		From:    "Precious Petals <enquiries@updates.preciouspetals.co.uk>",
		To:      []string{"customer@example.com"},
		ReplyTo: "enquiries@preciouspetals.co.uk",
		Subject: "Your flower preservation",
		Text:    "Plain text body",
		HTML:    "<html><body><img src=\"cid:footer\">HTML body</body></html>",
		Attachments: []ResendAttachment{
			{Filename: "invoice.pdf", ContentType: "application/pdf", Content: base64.StdEncoding.EncodeToString([]byte("pdf bytes"))},
			{Filename: "footer.png", ContentType: "image/png", ContentID: "footer", ContentDisposition: "inline", Content: base64.StdEncoding.EncodeToString([]byte("png bytes"))},
		},
	}

	raw, err := buildSentMIME(request, "<test@example.com>", time.Unix(1_700_000_000, 0))
	if err != nil {
		t.Fatalf("buildSentMIME returned error: %v", err)
	}
	message, err := mail.ReadMessage(bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("parse MIME message: %v", err)
	}
	if got := message.Header.Get("Message-ID"); got != "<test@example.com>" {
		t.Fatalf("Message-ID = %q", got)
	}
	body, err := io.ReadAll(message.Body)
	if err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{"multipart/alternative", "invoice.pdf", "footer.png", "Content-Id: <footer>"} {
		if !bytes.Contains(body, []byte(expected)) {
			t.Errorf("MIME body does not contain %q", expected)
		}
	}
}

func TestResendSuccessArchivesAndArchiveFailureDoesNotFailSend(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"id":"resend-id-123"}`)
	}))
	defer server.Close()

	archiver := &recordingSentArchiver{err: errors.New("IMAP unavailable")}
	client := &ResendClient{
		apiKey:   "test",
		from:     "sender@example.com",
		replyTo:  "reply@example.com",
		http:     server.Client(),
		endpoint: server.URL,
		archiver: archiver,
	}
	request := ResendEmailRequest{To: []string{"customer@example.com"}, Subject: "Subject", Text: "Body"}

	response, err := client.SendEmail(context.Background(), request, "email_log_123")
	if err != nil {
		t.Fatalf("SendEmail should ignore archive failure, got %v", err)
	}
	if response.ID != "resend-id-123" || archiver.calls != 1 {
		t.Fatalf("response ID = %q; archive calls = %d", response.ID, archiver.calls)
	}
	if archiver.request.From != "sender@example.com" || archiver.request.ReplyTo != "reply@example.com" {
		t.Fatalf("archiver did not receive finalized request: %#v", archiver.request)
	}
	if !strings.HasPrefix(archiver.messageID, "<resend-") {
		t.Fatalf("unexpected Message-ID %q", archiver.messageID)
	}
}

func TestResendFailureDoesNotArchive(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "bad request", http.StatusBadRequest)
	}))
	defer server.Close()

	archiver := &recordingSentArchiver{}
	client := &ResendClient{apiKey: "test", from: "sender@example.com", http: server.Client(), endpoint: server.URL, archiver: archiver}
	_, err := client.SendEmail(context.Background(), ResendEmailRequest{To: []string{"customer@example.com"}}, "key")
	if err == nil {
		t.Fatal("expected Resend failure")
	}
	if archiver.calls != 0 {
		t.Fatalf("archive calls = %d; want 0", archiver.calls)
	}
}

func TestSentMessageIDIsStableForResendRetries(t *testing.T) {
	request := ResendEmailRequest{From: "sender@example.com", To: []string{"customer@example.com"}, Subject: "Subject"}
	first := sentMessageID("resend-id-123", "email_log_123", request)
	second := sentMessageID("resend-id-123", "a-different-key", ResendEmailRequest{})
	if first != second {
		t.Fatalf("Message-ID changed for the same Resend ID: %q != %q", first, second)
	}
	if first == sentMessageID("resend-id-456", "email_log_123", request) {
		t.Fatal("different Resend IDs produced the same Message-ID")
	}
}
