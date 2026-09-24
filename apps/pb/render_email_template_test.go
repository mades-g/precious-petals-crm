package main

import (
	"encoding/json"
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

func TestRecommendationEmailIncludesPaperweightInHTMLAndText(t *testing.T) {
	tests := []struct {
		name                  string
		items                 string
		wantPaperweight       bool
		wantSeparateFrameNote bool
	}{
		{
			name:                  "frame and paperweights",
			items:                 `"frames":[{"recommendedSize":"20 x 20","layout":"Meadow","frameType":"Modern white","price":1027}],"paperweight":{"quantity":2,"price":164}`,
			wantPaperweight:       true,
			wantSeparateFrameNote: true,
		},
		{
			name:            "paperweights only",
			items:           `"paperweight":{"quantity":2,"price":164}`,
			wantPaperweight: true,
		},
		{
			name:  "frame only",
			items: `"frames":[{"recommendedSize":"20 x 20","layout":"Meadow","frameType":"Modern white","price":1027}]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var payload invoicePayload
			raw := `{"customer":{"title":"Mrs","surname":"Example"},"order":{"orderNo":30338},` + tt.items + `}`
			if err := json.Unmarshal([]byte(raw), &payload); err != nil {
				t.Fatalf("unmarshal payload: %v", err)
			}

			frames, paperweight := buildRecommendationEmailContentFromPayload(payload)
			html, err := renderEmailTemplate(
				filepath.Join("pb_hooks", "views"),
				"email.recommendation.html",
				buildRecommendationTemplateData(payload, "18 September 2026", "30338", frames, paperweight, ""),
			)
			if err != nil {
				t.Fatalf("render email: %v", err)
			}
			plainText := buildRecommendationTextBody(payload, "18 September 2026", "30338", frames, paperweight)

			for name, body := range map[string]string{"HTML": html, "text": plainText} {
				if got := strings.Contains(body, "2 paperweights"); got != tt.wantPaperweight {
					t.Errorf("%s paperweight quantity present = %v, want %v", name, got, tt.wantPaperweight)
				}
				if got := strings.Contains(body, "£164.00 in total"); got != tt.wantPaperweight {
					t.Errorf("%s paperweight price present = %v, want %v", name, got, tt.wantPaperweight)
				}
				if got := strings.Contains(body, "separate from the"); got != tt.wantSeparateFrameNote {
					t.Errorf("%s separate frame note present = %v, want %v", name, got, tt.wantSeparateFrameNote)
				}
			}
		})
	}
}
