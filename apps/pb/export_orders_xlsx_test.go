package main

import (
	"fmt"
	"testing"

	"github.com/pocketbase/pocketbase/core"
	"github.com/xuri/excelize/v2"
)

func newExportTestRecord(collectionName string, values map[string]any) *core.Record {
	coll := core.NewBaseCollection(collectionName)
	rec := core.NewRecord(coll)
	for key, value := range values {
		rec.Set(key, value)
	}
	return rec
}

func TestCalculateOrderTotalUsesVatInclusiveStoredPrices(t *testing.T) {
	order := newExportTestRecord("orders", map[string]any{})
	paperweight := newExportTestRecord("order_paperweight_items", map[string]any{
		"price": 1000.0,
	})

	total := calculateOrderTotal(order, nil, paperweight)

	if total != 1000 {
		t.Fatalf("expected VAT-inclusive total 1000.00, got %.2f", total)
	}
}

func TestCalculateOrderTotalIgnoresDisabledExtrasWithStalePrices(t *testing.T) {
	order := newExportTestRecord("orders", map[string]any{
		"replacementFlowers":       false,
		"replacementFlowersPrice":  40.0,
		"collection":               false,
		"collectionPrice":          50.0,
		"delivery":                 true,
		"deliveryPrice":            90.0,
		"recreateButtonhole":       false,
		"recreateButtonholePrice":  300.0,
		"returnUnusedFlowers":      false,
		"returnUnusedFlowersPrice": 30.0,
	})

	total := calculateOrderTotal(order, nil, nil)

	if total != 90 {
		t.Fatalf("expected only enabled extras to be counted, got %.2f", total)
	}
}

func TestCollectRecordsPageByPageFetchesAllPages(t *testing.T) {
	totalRecords := recordPageSize*2 + 37
	allRecords := make([]*core.Record, 0, totalRecords)
	for i := 0; i < totalRecords; i++ {
		allRecords = append(allRecords, newExportTestRecord("order_payments", map[string]any{
			"id": fmt.Sprintf("payment-%d", i),
		}))
	}

	var offsets []int
	result, err := collectRecordsPageByPage(func(limit, offset int) ([]*core.Record, error) {
		offsets = append(offsets, offset)
		if offset >= len(allRecords) {
			return []*core.Record{}, nil
		}
		end := offset + limit
		if end > len(allRecords) {
			end = len(allRecords)
		}
		return allRecords[offset:end], nil
	})
	if err != nil {
		t.Fatalf("expected pagination to succeed, got error: %v", err)
	}

	if len(result) != totalRecords {
		t.Fatalf("expected %d records, got %d", totalRecords, len(result))
	}

	expectedOffsets := []int{0, recordPageSize, recordPageSize * 2}
	if len(offsets) != len(expectedOffsets) {
		t.Fatalf("expected %d page fetches, got %d", len(expectedOffsets), len(offsets))
	}
	for i, offset := range expectedOffsets {
		if offsets[i] != offset {
			t.Fatalf("expected page fetch %d to use offset %d, got %d", i, offset, offsets[i])
		}
	}
}

func TestWriteOrdersSheetUsesEnabledFlagsForExtras(t *testing.T) {
	file := excelize.NewFile()
	file.SetSheetName("Sheet1", "Orders")

	order := newExportTestRecord("orders", map[string]any{
		"orderNo":                  201,
		"created":                  "2026-04-04 10:00:00",
		"updated":                  "2026-04-04 11:00:00",
		"occasionDate":             "2026-05-01",
		"orderStatus":              "chosen",
		"payment_status":           "second_deposit_paid",
		"replacementFlowers":       true,
		"replacementFlowersPrice":  100.0,
		"collection":               true,
		"collectionPrice":          300.0,
		"delivery":                 false,
		"deliveryPrice":            500.0,
		"recreateButtonhole":       true,
		"recreateButtonholePrice":  350.0,
		"returnUnusedFlowers":      false,
		"returnUnusedFlowersPrice": 30.0,
		"artistHours":              "4",
		"notes":                    "Please add ribbon",
	})
	order.Set("id", "order-201")

	writeOrdersSheet(
		file,
		[]*core.Record{order},
		map[string]orderExportCustomer{
			"order-201": {
				name:  "Mr Eudes Duarte",
				email: "eudes@example.com",
			},
		},
		map[string][]*core.Record{},
	)

	rows, err := file.GetRows("Orders")
	if err != nil {
		t.Fatalf("expected rows to be readable, got error: %v", err)
	}

	expectedHeaders := []string{
		"Order No",
		"Created",
		"Updated",
		"Occasion Date",
		"Customer Name",
		"Customer Email",
		"Order Status",
		"Payment Status",
		"Replacement Flowers",
		"Replacement Flowers Price",
		"Collection",
		"Collection Price",
		"Delivery",
		"Delivery Price",
		"Recreate Buttonhole",
		"Recreate Buttonhole Price",
		"Return Unused Flowers",
		"Return Unused Flowers Price",
		"Artist Hours",
		"Notes",
		"Frames",
	}
	if len(rows) < 2 {
		t.Fatalf("expected header and data rows, got %d rows", len(rows))
	}
	if got := rows[0]; len(got) != len(expectedHeaders) {
		t.Fatalf("expected %d headers, got %d", len(expectedHeaders), len(got))
	}
	for i, header := range expectedHeaders {
		if rows[0][i] != header {
			t.Fatalf("expected header %d to be %q, got %q", i, header, rows[0][i])
		}
	}

	expectedRow := []string{
		"201",
		"04-04-2026",
		"04-04-2026",
		"01-05-2026",
		"Mr Eudes Duarte",
		"eudes@example.com",
		"chosen",
		"second_deposit_paid",
		"TRUE",
		"100",
		"TRUE",
		"300",
		"FALSE",
		"500",
		"TRUE",
		"350",
		"FALSE",
		"30",
		"4",
		"Please add ribbon",
	}
	for i, expected := range expectedRow {
		if rows[1][i] != expected {
			t.Fatalf("expected row value %d to be %q, got %q", i, expected, rows[1][i])
		}
	}
}
