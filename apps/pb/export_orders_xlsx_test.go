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
		"How Recommended",
		"Mount Cut",
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
		"",
		"FALSE",
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

func TestExportIncludesCustomerRecommendationSource(t *testing.T) {
	file := excelize.NewFile()
	t.Cleanup(func() { _ = file.Close() })
	file.SetSheetName("Sheet1", "Production Overview")
	file.NewSheet("Orders")

	orders := []*core.Record{}
	customers := map[string]orderExportCustomer{}
	wantSources := []string{"Previous customer", "Google", "", ""}
	for i, source := range wantSources {
		id := fmt.Sprintf("order-%d", i)
		order := newExportTestRecord("orders", map[string]any{"id": id, "orderNo": i + 1})
		orders = append(orders, order)
		if i == 3 {
			continue // An order without a linked customer still exports.
		}
		customer := newExportTestRecord("customers", map[string]any{
			"firstName":      fmt.Sprintf("Customer %d", i),
			"howRecommended": "  " + source + "  ",
		})
		customers[id] = buildOrderExportCustomer(customer)
	}
	writeProductionOverviewSheet(file, "Production Overview", orders, nil, customers, nil, nil, nil)
	writeOrdersSheet(file, orders, customers, nil)

	buffer, err := file.WriteToBuffer()
	if err != nil {
		t.Fatal(err)
	}
	exported, err := excelize.OpenReader(buffer)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = exported.Close() })
	for sheet, header := range map[string]string{"Production Overview": "How recommended", "Orders": "How Recommended"} {
		rows, err := exported.GetRows(sheet)
		if err != nil {
			t.Fatal(err)
		}
		column := indexOfHeader(rows[0], header)
		if column == 0 {
			t.Fatalf("%s is missing %q", sheet, header)
		}
		for i, want := range wantSources {
			cell, _ := excelize.CoordinatesToCellName(column, i+2)
			got, err := exported.GetCellValue(sheet, cell)
			if err != nil || got != want {
				t.Fatalf("%s!%s: want %q, got %q (error: %v)", sheet, cell, want, got, err)
			}
		}
	}
}

func TestProductionOverviewReplacementFlowersRequired(t *testing.T) {
	for _, tt := range []struct {
		name   string
		values map[string]any
		want   string
	}{
		{"required with no charge", map[string]any{"replacementFlowers": true, "replacementFlowersPrice": 0}, "Yes"},
		{"not required with stale charge", map[string]any{"replacementFlowers": false, "replacementFlowersPrice": 40}, "No"},
		{"unset on existing order", map[string]any{}, "No"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			file := excelize.NewFile()
			t.Cleanup(func() { _ = file.Close() })
			order := newExportTestRecord("orders", tt.values)
			writeProductionOverviewSheet(file, "Sheet1", []*core.Record{order}, nil, nil, nil, nil, nil)
			rows, err := file.GetRows("Sheet1")
			if err != nil {
				t.Fatal(err)
			}
			column := indexOfHeader(rows[0], "Replacement flowers required")
			if column == 0 {
				t.Fatal("missing Replacement flowers required column")
			}
			cell, _ := excelize.CoordinatesToCellName(column, 2)
			got, err := file.GetCellValue("Sheet1", cell)
			if err != nil || got != tt.want {
				t.Fatalf("want %q, got %q (error: %v)", tt.want, got, err)
			}
		})
	}
}

func TestExportMountCutStatus(t *testing.T) {
	for _, tt := range []struct {
		name         string
		values       map[string]any
		wantOverview string
		wantOrders   string
	}{
		{"cut", map[string]any{"mountCut": true}, "Yes", "TRUE"},
		{"not cut", map[string]any{"mountCut": false}, "No", "FALSE"},
		{"existing order without field", map[string]any{}, "No", "FALSE"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			file := excelize.NewFile()
			t.Cleanup(func() { _ = file.Close() })
			file.SetSheetName("Sheet1", "Production Overview")
			file.NewSheet("Orders")
			order := newExportTestRecord("orders", tt.values)
			order.Id = "order-1"
			frame := newExportTestRecord("order_frame_items", map[string]any{"frameType": "Oak"})
			frames := map[string][]*core.Record{order.Id: {frame, frame}}
			writeProductionOverviewSheet(file, "Production Overview", []*core.Record{order}, nil, nil, frames, nil, nil)
			writeOrdersSheet(file, []*core.Record{order}, nil, frames)
			buffer, err := file.WriteToBuffer()
			if err != nil {
				t.Fatal(err)
			}
			exported, err := excelize.OpenReader(buffer)
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = exported.Close() })
			for _, expected := range []struct{ sheet, header, want string }{
				{"Production Overview", "Mount cut", tt.wantOverview},
				{"Orders", "Mount Cut", tt.wantOrders},
				{"Production Overview", "Total frames", "2"},
				{"Production Overview", "Frame 2 style", "Oak"},
			} {
				rows, err := exported.GetRows(expected.sheet)
				if err != nil {
					t.Fatal(err)
				}
				column := indexOfHeader(rows[0], expected.header)
				if column == 0 {
					t.Fatalf("%s: missing %s", expected.sheet, expected.header)
				}
				cell, _ := excelize.CoordinatesToCellName(column, 2)
				got, err := exported.GetCellValue(expected.sheet, cell)
				if err != nil || got != expected.want {
					t.Fatalf("%s!%s: want %q, got %q (error: %v)", expected.sheet, cell, expected.want, got, err)
				}
			}
		})
	}
}
