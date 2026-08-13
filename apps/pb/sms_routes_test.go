package main

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestNormalizePhoneNumberForWebexInteract(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"07700 900123", "+447700900123"},
		{"+44 7700 900123", "+447700900123"},
		{"0044 7700 900123", "+447700900123"},
		{"447700900123", "+447700900123"},
	}

	for _, tt := range tests {
		display, provider, err := normalizePhoneNumber(tt.input)
		if err != nil {
			t.Fatalf("normalizePhoneNumber(%q): %v", tt.input, err)
		}
		if display != tt.want || provider != tt.want {
			t.Fatalf("normalizePhoneNumber(%q) = %q, %q; want %q", tt.input, display, provider, tt.want)
		}
	}
}

func TestSendWebexInteractSMS(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		if got := req.Header.Get("X-AUTH-KEY"); got != "access-token" {
			t.Fatalf("X-AUTH-KEY = %q", got)
		}
		if got := req.Header.Get("Content-Type"); got != "application/json" {
			t.Fatalf("Content-Type = %q", got)
		}
		body, err := io.ReadAll(req.Body)
		if err != nil {
			t.Fatal(err)
		}
		for _, want := range []string{`"message_body":"hello"`, `"from":"PrecPetals"`, `"phone":["+447700900123"]`} {
			if !strings.Contains(string(body), want) {
				t.Fatalf("request body %s does not contain %s", body, want)
			}
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body: io.NopCloser(strings.NewReader(`{
				"request_id":"aps_123",
				"messages":[{"transaction_id":"tid_123","to":"+447700900123","status":"queued","code":1001}],
				"errors":[]
			}`)),
			Header: make(http.Header),
		}, nil
	})}

	id, err := sendWebexInteractSMS(client, "https://example.test/v1/sms", "access-token", "PrecPetals", "+447700900123", "hello")
	if err != nil {
		t.Fatal(err)
	}
	if id != "tid_123" {
		t.Fatalf("transaction id = %q", id)
	}
}

func TestSendWebexInteractSMSReturnsProviderError(t *testing.T) {
	client := &http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusUnauthorized,
			Body:       io.NopCloser(strings.NewReader(`{"errors":[{"message":"Invalid access token","code":10000}]}`)),
			Header:     make(http.Header),
		}, nil
	})}

	_, err := sendWebexInteractSMS(client, "https://example.test/v1/sms", "bad-token", "PrecPetals", "+447700900123", "hello")
	if err == nil || err.Error() != "Invalid access token" {
		t.Fatalf("error = %v", err)
	}
}
