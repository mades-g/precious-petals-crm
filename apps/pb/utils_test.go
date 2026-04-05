package main

import "testing"

func numberPtr(value float64) *float64 {
	return &value
}

func TestBuildInvoiceRowsUsesAdditionalMountLabel(t *testing.T) {
	payload := invoicePayload{
		Frames: []struct {
			Size             string `json:"size"`
			MeasuredSize     string `json:"measuredSize"`
			RecommendedSize  string `json:"recommendedSize"`
			FrameType        string `json:"frameType"`
			GlassType        string `json:"glassType"`
			Layout           string `json:"layout"`
			PreservationType string `json:"preservationType"`
			Inclusions       string `json:"inclusions"`
			SpecialNotes     string `json:"specialNotes"`
			MountColour      string `json:"mountColour"`
			GlassEngraving   string `json:"glassEngraving"`

			Price  Number `json:"price"`
			Extras *struct {
				FramePrice          Number `json:"framePrice"`
				MountPrice          Number `json:"mountPrice"`
				GlassPrice          Number `json:"glassPrice"`
				GlassEngravingPrice Number `json:"glassEngravingPrice"`
			} `json:"extras"`
		}{
			{
				RecommendedSize:  `10" x 8"`,
				FrameType:        "Oak",
				GlassType:        "Conservation glass",
				Layout:           "Single",
				PreservationType: "Pressed",
				Inclusions:       "Buttonhole",
				MountColour:      "Cream",
				Price:            Number{Val: numberPtr(300)},
				Extras: &struct {
					FramePrice          Number `json:"framePrice"`
					MountPrice          Number `json:"mountPrice"`
					GlassPrice          Number `json:"glassPrice"`
					GlassEngravingPrice Number `json:"glassEngravingPrice"`
				}{
					MountPrice: Number{Val: numberPtr(75)},
				},
			},
		},
	}

	rows := buildInvoiceRows(payload)
	if len(rows) != 2 {
		t.Fatalf("expected 2 invoice rows, got %d", len(rows))
	}

	if rows[1].Description != "Additional Mount - Cream" {
		t.Fatalf("expected invoice mount description to use Additional Mount, got %q", rows[1].Description)
	}

	if rows[1].Amount != "£75.00" {
		t.Fatalf("expected invoice mount amount £75.00, got %q", rows[1].Amount)
	}
}

func TestBuildInvoiceRowsFormatsMainFrameLineWithInches(t *testing.T) {
	payload := invoicePayload{
		Frames: []struct {
			Size             string `json:"size"`
			MeasuredSize     string `json:"measuredSize"`
			RecommendedSize  string `json:"recommendedSize"`
			FrameType        string `json:"frameType"`
			GlassType        string `json:"glassType"`
			Layout           string `json:"layout"`
			PreservationType string `json:"preservationType"`
			Inclusions       string `json:"inclusions"`
			SpecialNotes     string `json:"specialNotes"`
			MountColour      string `json:"mountColour"`
			GlassEngraving   string `json:"glassEngraving"`

			Price  Number `json:"price"`
			Extras *struct {
				FramePrice          Number `json:"framePrice"`
				MountPrice          Number `json:"mountPrice"`
				GlassPrice          Number `json:"glassPrice"`
				GlassEngravingPrice Number `json:"glassEngravingPrice"`
			} `json:"extras"`
		}{
			{
				RecommendedSize:  `10 x 8 in`,
				Layout:           "Single",
				FrameType:        "Oak",
				GlassType:        "Conservation glass",
				PreservationType: "Pressed",
				Price:            Number{Val: numberPtr(300)},
			},
		},
	}

	rows := buildInvoiceRows(payload)
	if len(rows) != 1 {
		t.Fatalf("expected 1 invoice row, got %d", len(rows))
	}

	if rows[0].Description != "Picture, 10 x 8 inches, Oak, Pressed, Conservation glass" {
		t.Fatalf("unexpected main invoice description %q", rows[0].Description)
	}
}

func TestBuildInvoiceRowsKeepsClearviewOnSeparatePricedLine(t *testing.T) {
	payload := invoicePayload{
		Frames: []struct {
			Size             string `json:"size"`
			MeasuredSize     string `json:"measuredSize"`
			RecommendedSize  string `json:"recommendedSize"`
			FrameType        string `json:"frameType"`
			GlassType        string `json:"glassType"`
			Layout           string `json:"layout"`
			PreservationType string `json:"preservationType"`
			Inclusions       string `json:"inclusions"`
			SpecialNotes     string `json:"specialNotes"`
			MountColour      string `json:"mountColour"`
			GlassEngraving   string `json:"glassEngraving"`

			Price  Number `json:"price"`
			Extras *struct {
				FramePrice          Number `json:"framePrice"`
				MountPrice          Number `json:"mountPrice"`
				GlassPrice          Number `json:"glassPrice"`
				GlassEngravingPrice Number `json:"glassEngravingPrice"`
			} `json:"extras"`
		}{
			{
				RecommendedSize:  `10" x 8"`,
				Layout:           "Single",
				FrameType:        "Oak",
				GlassType:        "Clearview uv glass",
				PreservationType: "Pressed",
				Price:            Number{Val: numberPtr(300)},
				Extras: &struct {
					FramePrice          Number `json:"framePrice"`
					MountPrice          Number `json:"mountPrice"`
					GlassPrice          Number `json:"glassPrice"`
					GlassEngravingPrice Number `json:"glassEngravingPrice"`
				}{
					GlassPrice: Number{Val: numberPtr(40)},
				},
			},
		},
	}

	rows := buildInvoiceRows(payload)
	if len(rows) != 2 {
		t.Fatalf("expected 2 invoice rows, got %d", len(rows))
	}

	if rows[0].Description != "Picture, 10 x 8 inches, Oak, Pressed" {
		t.Fatalf("unexpected main invoice description %q", rows[0].Description)
	}

	if rows[1].Description != "Glass - Clearview uv glass" {
		t.Fatalf("unexpected Clearview line %q", rows[1].Description)
	}

	if rows[1].Amount != "£40.00" {
		t.Fatalf("expected Clearview amount £40.00, got %q", rows[1].Amount)
	}
}

func TestBuildInvoiceRowsIncludesRecreateButtonholeExtra(t *testing.T) {
	payload := invoicePayload{
		OrderExtras: &struct {
			ReplacementFlowers       bool   `json:"replacementFlowers"`
			ReplacementFlowersPrice  Number `json:"replacementFlowersPrice"`
			Collection               bool   `json:"collection"`
			CollectionPrice          Number `json:"collectionPrice"`
			Delivery                 bool   `json:"delivery"`
			DeliveryPrice            Number `json:"deliveryPrice"`
			RecreateButtonhole       bool   `json:"recreateButtonhole"`
			RecreateButtonholePrice  Number `json:"recreateButtonholePrice"`
			ReturnUnusedFlowers      bool   `json:"returnUnusedFlowers"`
			ReturnUnusedFlowersPrice Number `json:"returnUnusedFlowersPrice"`
			ArtistHours              Number `json:"artistHours"`
			Notes                    string `json:"notes"`
		}{
			RecreateButtonhole:      true,
			RecreateButtonholePrice: Number{Val: numberPtr(80)},
		},
	}

	rows := buildInvoiceRows(payload)
	if len(rows) != 1 {
		t.Fatalf("expected 1 invoice row, got %d", len(rows))
	}

	if rows[0].Description != "Recreate buttonhole" {
		t.Fatalf("unexpected recreate buttonhole line %q", rows[0].Description)
	}

	if rows[0].Amount != "£80.00" {
		t.Fatalf("expected recreate buttonhole amount £80.00, got %q", rows[0].Amount)
	}
}

func TestBuildInvoiceRowsOtherExtrasDoNotShowQty(t *testing.T) {
	payload := invoicePayload{
		OrderExtras: &struct {
			ReplacementFlowers       bool   `json:"replacementFlowers"`
			ReplacementFlowersPrice  Number `json:"replacementFlowersPrice"`
			Collection               bool   `json:"collection"`
			CollectionPrice          Number `json:"collectionPrice"`
			Delivery                 bool   `json:"delivery"`
			DeliveryPrice            Number `json:"deliveryPrice"`
			RecreateButtonhole       bool   `json:"recreateButtonhole"`
			RecreateButtonholePrice  Number `json:"recreateButtonholePrice"`
			ReturnUnusedFlowers      bool   `json:"returnUnusedFlowers"`
			ReturnUnusedFlowersPrice Number `json:"returnUnusedFlowersPrice"`
			ArtistHours              Number `json:"artistHours"`
			Notes                    string `json:"notes"`
		}{
			ReplacementFlowers:      true,
			ReplacementFlowersPrice: Number{Val: numberPtr(30)},
			Collection:              true,
			CollectionPrice:         Number{Val: numberPtr(10)},
			Delivery:                true,
			DeliveryPrice:           Number{Val: numberPtr(200)},
		},
	}

	rows := buildInvoiceRows(payload)
	if len(rows) != 3 {
		t.Fatalf("expected 3 invoice rows, got %d", len(rows))
	}

	if rows[0].Description != "Replacement flowers" {
		t.Fatalf("unexpected replacement flowers line %q", rows[0].Description)
	}

	if rows[1].Description != "Collection" {
		t.Fatalf("unexpected collection line %q", rows[1].Description)
	}

	if rows[2].Description != "Delivery" {
		t.Fatalf("unexpected delivery line %q", rows[2].Description)
	}
}

func TestBuildInvoiceRowsIncludesEnabledZeroValueOtherExtras(t *testing.T) {
	payload := invoicePayload{
		OrderExtras: &struct {
			ReplacementFlowers       bool   `json:"replacementFlowers"`
			ReplacementFlowersPrice  Number `json:"replacementFlowersPrice"`
			Collection               bool   `json:"collection"`
			CollectionPrice          Number `json:"collectionPrice"`
			Delivery                 bool   `json:"delivery"`
			DeliveryPrice            Number `json:"deliveryPrice"`
			RecreateButtonhole       bool   `json:"recreateButtonhole"`
			RecreateButtonholePrice  Number `json:"recreateButtonholePrice"`
			ReturnUnusedFlowers      bool   `json:"returnUnusedFlowers"`
			ReturnUnusedFlowersPrice Number `json:"returnUnusedFlowersPrice"`
			ArtistHours              Number `json:"artistHours"`
			Notes                    string `json:"notes"`
		}{
			ReplacementFlowers:       true,
			ReplacementFlowersPrice:  Number{Val: numberPtr(0)},
			Collection:               true,
			CollectionPrice:          Number{Val: numberPtr(0)},
			Delivery:                 true,
			DeliveryPrice:            Number{Val: numberPtr(0)},
			RecreateButtonhole:       true,
			RecreateButtonholePrice:  Number{Val: numberPtr(0)},
			ReturnUnusedFlowers:      true,
			ReturnUnusedFlowersPrice: Number{Val: numberPtr(0)},
		},
	}

	rows := buildInvoiceRows(payload)
	if len(rows) != 5 {
		t.Fatalf("expected 5 invoice rows, got %d", len(rows))
	}

	for _, row := range rows {
		if row.Amount != "£0.00" {
			t.Fatalf("expected zero-value enabled extra to render as £0.00, got %q for %q", row.Amount, row.Description)
		}
	}
}

func TestBuildInvoiceViewModelMergesInclusionsIntoNotes(t *testing.T) {
	payload := invoicePayload{
		OrderExtras: &struct {
			ReplacementFlowers       bool   `json:"replacementFlowers"`
			ReplacementFlowersPrice  Number `json:"replacementFlowersPrice"`
			Collection               bool   `json:"collection"`
			CollectionPrice          Number `json:"collectionPrice"`
			Delivery                 bool   `json:"delivery"`
			DeliveryPrice            Number `json:"deliveryPrice"`
			RecreateButtonhole       bool   `json:"recreateButtonhole"`
			RecreateButtonholePrice  Number `json:"recreateButtonholePrice"`
			ReturnUnusedFlowers      bool   `json:"returnUnusedFlowers"`
			ReturnUnusedFlowersPrice Number `json:"returnUnusedFlowersPrice"`
			ArtistHours              Number `json:"artistHours"`
			Notes                    string `json:"notes"`
		}{
			Notes: "Please add ribbon",
		},
		Frames: []struct {
			Size             string `json:"size"`
			MeasuredSize     string `json:"measuredSize"`
			RecommendedSize  string `json:"recommendedSize"`
			FrameType        string `json:"frameType"`
			GlassType        string `json:"glassType"`
			Layout           string `json:"layout"`
			PreservationType string `json:"preservationType"`
			Inclusions       string `json:"inclusions"`
			SpecialNotes     string `json:"specialNotes"`
			MountColour      string `json:"mountColour"`
			GlassEngraving   string `json:"glassEngraving"`

			Price  Number `json:"price"`
			Extras *struct {
				FramePrice          Number `json:"framePrice"`
				MountPrice          Number `json:"mountPrice"`
				GlassPrice          Number `json:"glassPrice"`
				GlassEngravingPrice Number `json:"glassEngravingPrice"`
			} `json:"extras"`
		}{
			{
				Inclusions:   "Yes",
				SpecialNotes: "test 1\nTest 3",
			},
			{
				Inclusions: "Buttonhole",
			},
		},
	}

	view := buildInvoiceViewModel(payload, "", "", false)

	expected := "Please add ribbon\nBouquet #1 Include: test 1, Test 3\nBouquet #2 Include: Buttonhole"
	if view.Notes != expected {
		t.Fatalf("expected merged invoice notes %q, got %q", expected, view.Notes)
	}
}

func TestBuildInvoiceViewModelDoesNotDuplicatePreMergedInclusionNotes(t *testing.T) {
	payload := invoicePayload{
		OrderExtras: &struct {
			ReplacementFlowers       bool   `json:"replacementFlowers"`
			ReplacementFlowersPrice  Number `json:"replacementFlowersPrice"`
			Collection               bool   `json:"collection"`
			CollectionPrice          Number `json:"collectionPrice"`
			Delivery                 bool   `json:"delivery"`
			DeliveryPrice            Number `json:"deliveryPrice"`
			RecreateButtonhole       bool   `json:"recreateButtonhole"`
			RecreateButtonholePrice  Number `json:"recreateButtonholePrice"`
			ReturnUnusedFlowers      bool   `json:"returnUnusedFlowers"`
			ReturnUnusedFlowersPrice Number `json:"returnUnusedFlowersPrice"`
			ArtistHours              Number `json:"artistHours"`
			Notes                    string `json:"notes"`
		}{
			Notes: "Please add ribbon\nInclude: test 1, Test 3",
		},
		Frames: []struct {
			Size             string `json:"size"`
			MeasuredSize     string `json:"measuredSize"`
			RecommendedSize  string `json:"recommendedSize"`
			FrameType        string `json:"frameType"`
			GlassType        string `json:"glassType"`
			Layout           string `json:"layout"`
			PreservationType string `json:"preservationType"`
			Inclusions       string `json:"inclusions"`
			SpecialNotes     string `json:"specialNotes"`
			MountColour      string `json:"mountColour"`
			GlassEngraving   string `json:"glassEngraving"`

			Price  Number `json:"price"`
			Extras *struct {
				FramePrice          Number `json:"framePrice"`
				MountPrice          Number `json:"mountPrice"`
				GlassPrice          Number `json:"glassPrice"`
				GlassEngravingPrice Number `json:"glassEngravingPrice"`
			} `json:"extras"`
		}{
			{
				Inclusions:   "Yes",
				SpecialNotes: "test 1\nTest 3",
			},
		},
	}

	view := buildInvoiceViewModel(payload, "", "", false)

	expected := "Please add ribbon\nInclude: test 1, Test 3"
	if view.Notes != expected {
		t.Fatalf("expected deduplicated invoice notes %q, got %q", expected, view.Notes)
	}
}
