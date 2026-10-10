package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func deliveryInvoicePayload(t *testing.T) invoicePayload {
	t.Helper()
	var payload invoicePayload
	err := json.Unmarshal([]byte(`{
		"customer": {"firstName":"Ada", "surname":"Lovelace"},
		"order": {
			"orderNo": 201, "occasionDate":"2026-09-12",
			"billingAddressLine1":"1 Billing Road", "billingTown":"London", "billingPostcode":"SW1A 1AA",
			"deliverySameAsBilling":false,
			"deliveryAddressLine1":"2 Delivery Road", "deliveryAddressLine2":"Flat 3",
			"deliveryTown":"Oxford", "deliveryCounty":"Oxfordshire", "deliveryPostcode":"OX1 1AA"
		},
		"frames":[{"recommendedSize":"10 x 8 inches", "frameType":"Oak", "preservationType":"Pressed", "price":300}],
		"totals":{"subTotal":250, "vatTotal":50, "grandTotal":300}
	}`), &payload)
	if err != nil {
		t.Fatal(err)
	}
	return payload
}

func TestInvoiceDeliveryAddress(t *testing.T) {
	for _, tt := range []struct {
		name         string
		change       func(*invoicePayload)
		wantDelivery bool
	}{
		{"different delivery address", func(*invoicePayload) {}, true},
		{"same as billing flag ignores stale delivery", func(p *invoicePayload) { p.Order.DeliverySameAsBilling = true }, false},
		{"identical addresses", func(p *invoicePayload) {
			p.Order.DeliveryAddressLine1 = p.Order.BillingAddressLine1
			p.Order.DeliveryAddressLine2 = ""
			p.Order.DeliveryTown = p.Order.BillingTown
			p.Order.DeliveryCounty = ""
			p.Order.DeliveryPostcode = p.Order.BillingPostcode
		}, false},
		{"equivalent formatting", func(p *invoicePayload) {
			p.Order.DeliveryAddressLine1 = "  1  BILLING Road  "
			p.Order.DeliveryAddressLine2 = " "
			p.Order.DeliveryTown = " LONDON "
			p.Order.DeliveryCounty = ""
			p.Order.DeliveryPostcode = "sw1a1aa"
		}, false},
		{"missing delivery on older order", func(p *invoicePayload) {
			p.Order.DeliveryAddressLine1 = ""
			p.Order.DeliveryAddressLine2 = " "
			p.Order.DeliveryTown = ""
			p.Order.DeliveryCounty = ""
			p.Order.DeliveryPostcode = ""
		}, false},
		{"different flat at same postcode", func(p *invoicePayload) {
			p.Order.DeliveryAddressLine1 = p.Order.BillingAddressLine1
			p.Order.DeliveryTown = p.Order.BillingTown
			p.Order.DeliveryPostcode = p.Order.BillingPostcode
		}, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			payload := deliveryInvoicePayload(t)
			tt.change(&payload)
			view := buildInvoiceViewModel(payload, "", "", false)
			if view.Address != "Ada Lovelace\n1 Billing Road\nLondon\nSW1A 1AA" {
				t.Fatalf("billing address changed: %q", view.Address)
			}
			if (view.DeliveryAddress != "") != tt.wantDelivery {
				t.Fatalf("delivery presence: want %t, got %q", tt.wantDelivery, view.DeliveryAddress)
			}
			if tt.wantDelivery && !strings.Contains(view.DeliveryAddress, payload.Order.DeliveryPostcode) {
				t.Fatalf("delivery address incomplete: %q", view.DeliveryAddress)
			}
			html, err := renderInvoiceTemplate("pb_hooks/views/invoice.preview.html", view)
			if err != nil {
				t.Fatal(err)
			}
			if strings.Contains(html, "<strong>Delivery address</strong>") != tt.wantDelivery {
				t.Fatal("rendered invoice delivery section does not match address difference")
			}
			if !strings.Contains(html, "1 Billing Road") {
				t.Fatal("rendered invoice lost billing address")
			}
		})
	}
}

func TestInvoiceDeliveryAddressEscapesCustomerContent(t *testing.T) {
	payload := deliveryInvoicePayload(t)
	payload.Order.DeliveryAddressLine1 = `<script>alert("address")</script> & Road`
	html, err := renderInvoiceTemplate("pb_hooks/views/invoice.preview.html", buildInvoiceViewModel(payload, "", "", false))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(html, "<script>") || !strings.Contains(html, "&lt;script&gt;") || !strings.Contains(html, "&amp; Road") {
		t.Fatal("delivery address must be rendered as escaped text")
	}
}
