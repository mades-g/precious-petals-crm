package main

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestRenderEmailTemplateUsesLogoHeader(t *testing.T) {
	viewsDir := filepath.Join("pb_hooks", "views")

	html, err := renderEmailTemplate(viewsDir, "email.invoice.html", map[string]any{
		"logoDataURI": "data:image/png;base64,ZmFrZQ==",
		"customer": map[string]any{
			"title":   "Mrs",
			"surname": "Smith",
		},
		"order": map[string]any{
			"occasionDate":  "24 April 2026",
			"requiredBy":    "24 May 2026",
			"invoiceNumber": "PP-123",
		},
	})
	if err != nil {
		t.Fatalf("renderEmailTemplate returned error: %v", err)
	}

	if !strings.Contains(html, "Precious Petals") {
		t.Fatalf("expected rendered email to include logo alt text")
	}

	if !strings.Contains(html, `src="data:image/png;base64,ZmFrZQ=="`) {
		t.Fatalf("expected rendered email to include the logo data URI")
	}

	if !strings.Contains(html, `alt="Precious Petals"`) {
		t.Fatalf("expected rendered email to include the logo image")
	}

	if !strings.Contains(html, "Every display we create is individual") {
		t.Fatalf("expected rendered invoice email to include final invoice wording")
	}

	if strings.Contains(html, "Flower Preservation Specialists") {
		t.Fatalf("expected shared header to use the logo image, not text header copy")
	}
}
