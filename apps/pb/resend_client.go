package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
)

const resendSendEmailURL = "https://api.resend.com/emails"

type ResendClient struct {
	apiKey  string
	from    string
	replyTo string
	http    *http.Client
}

type ResendEmailRequest struct {
	From        string             `json:"from"`
	To          []string           `json:"to"`
	Subject     string             `json:"subject"`
	HTML        string             `json:"html,omitempty"`
	Text        string             `json:"text,omitempty"`
	ReplyTo     string             `json:"reply_to,omitempty"`
	Attachments []ResendAttachment `json:"attachments,omitempty"`
	Tags        []ResendTag        `json:"tags,omitempty"`
}

type ResendAttachment struct {
	Filename           string `json:"filename"`
	Content            string `json:"content,omitempty"` // base64 string
	Path               string `json:"path,omitempty"`    // remote URL (Resend can fetch)
	ContentType        string `json:"content_type,omitempty"`
	ContentID          string `json:"content_id,omitempty"`
	ContentDisposition string `json:"content_disposition,omitempty"` // "inline" for CID
}

type ResendTag struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ResendSendEmailResponse struct {
	ID string `json:"id"`
}

type ResendHTTPError struct {
	Status int
	Body   string
}

func (e *ResendHTTPError) Error() string {
	return fmt.Sprintf("resend api error: status=%d body=%s", e.Status, e.Body)
}

func NewResendClient(app *pocketbase.PocketBase) (*ResendClient, error) {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return nil, errors.New("missing RESEND_API_KEY")
	}

	from, err := resolveResendFrom(app)
	if err != nil {
		return nil, err
	}

	replyTo := strings.TrimSpace(os.Getenv("RESEND_REPLY_TO"))

	return &ResendClient{
		apiKey:  apiKey,
		from:    from,
		replyTo: replyTo,
		http: &http.Client{
			Timeout: 15 * time.Second,
		},
	}, nil
}

func resolveResendFrom(app *pocketbase.PocketBase) (string, error) {
	fromEmail := strings.TrimSpace(os.Getenv("RESEND_FROM"))
	if fromEmail == "" {
		fromEmail = strings.TrimSpace(app.Settings().Meta.SenderAddress)
	}
	if fromEmail == "" {
		return "", errors.New("missing RESEND_FROM")
	}

	// Already formatted, e.g. "Precious Petals <enquiries@updates.preciouspetals.co.uk>"
	if strings.Contains(fromEmail, "<") && strings.Contains(fromEmail, ">") {
		return fromEmail, nil
	}

	senderName := strings.TrimSpace(app.Settings().Meta.SenderName)
	if senderName == "" {
		return fromEmail, nil
	}

	return (&mail.Address{
		Name:    senderName,
		Address: fromEmail,
	}).String(), nil
}

func (c *ResendClient) SendEmail(ctx context.Context, req ResendEmailRequest, idempotencyKey string) (*ResendSendEmailResponse, error) {
	req.From = c.from
	if req.ReplyTo == "" && c.replyTo != "" {
		req.ReplyTo = c.replyTo
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal resend payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, resendSendEmailURL, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("build resend request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	if k := strings.TrimSpace(idempotencyKey); k != "" {
		httpReq.Header.Set("Idempotency-Key", k)
	}

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("resend http error: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read resend response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, &ResendHTTPError{
			Status: resp.StatusCode,
			Body:   strings.TrimSpace(string(respBody)),
		}
	}

	var parsed ResendSendEmailResponse
	if len(respBody) > 0 {
		_ = json.Unmarshal(respBody, &parsed)
	}

	return &parsed, nil
}
