package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/xuri/excelize/v2"
)

const (
	maxOrdersExport = 2000
	filterChunkSize = 200
)

type orderExportCustomer struct {
	id    string
	name  string
	email string
}

type sentByDisplay struct {
	name  string
	email string
}

type orderPaymentSummary struct {
	paidTotal   float64
	finalPaidOn string
}

func (s sentByDisplay) String() string {
	n := strings.TrimSpace(s.name)
	e := strings.TrimSpace(s.email)
	switch {
	case n != "" && e != "":
		return fmt.Sprintf("%s <%s>", n, e)
	case e != "":
		return e
	case n != "":
		return n
	default:
		return ""
	}
}

func handleOrdersExport(app *pocketbase.PocketBase, e *core.RequestEvent) error {
	query := e.Request.URL.Query()
	orderId := strings.TrimSpace(query.Get("orderId"))
	fromParam := strings.TrimSpace(query.Get("from"))
	toParam := strings.TrimSpace(query.Get("to"))
	paymentStatus := strings.TrimSpace(query.Get("paymentStatus"))
	orderStatus := strings.TrimSpace(query.Get("orderStatus"))

	filter, err := buildOrdersFilter(orderId, fromParam, toParam, paymentStatus, orderStatus)
	if err != nil {
		return e.JSON(http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
	}

	orders, err := app.FindRecordsByFilter("orders", filter, "-created", maxOrdersExport+1, 0)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to load orders.",
			"details": err.Error(),
		})
	}

	if len(orders) > maxOrdersExport {
		return e.JSON(http.StatusBadRequest, map[string]any{
			"ok":    false,
			"error": fmt.Sprintf("Too many orders (%d). Please narrow the date range.", len(orders)),
		})
	}

	// ---- Build id lists + maps ----
	orderIds := make([]string, 0, len(orders))
	orderNoById := map[string]int{}
	frameItemOrderMap := map[string]string{}
	paperweightOrderMap := map[string]string{}
	frameItemIds := []string{}
	paperweightItemIds := []string{}

	for _, order := range orders {
		oid := order.Id
		orderIds = append(orderIds, oid)
		orderNoById[oid] = order.GetInt("orderNo")

		frameIds := order.GetStringSlice("frameOrderId")
		for _, frameId := range frameIds {
			frameId = strings.TrimSpace(frameId)
			if frameId == "" {
				continue
			}
			frameItemIds = append(frameItemIds, frameId)
			frameItemOrderMap[frameId] = oid
		}

		pwId := strings.TrimSpace(order.GetString("paperweightOrderId"))
		if pwId != "" {
			paperweightItemIds = append(paperweightItemIds, pwId)
			paperweightOrderMap[pwId] = oid
		}
	}

	customers, err := fetchRecordsByField(app, "customers", "orderId", orderIds)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to load customers.",
			"details": err.Error(),
		})
	}

	customerByOrderId := map[string]orderExportCustomer{}
	customerById := map[string]orderExportCustomer{}
	for _, customer := range customers {
		relatedOrderId := strings.TrimSpace(customer.GetString("orderId"))
		name := strings.TrimSpace(strings.Join([]string{
			customer.GetString("title"),
			customer.GetString("firstName"),
			customer.GetString("surname"),
		}, " "))

		entry := orderExportCustomer{
			id:    customer.Id,
			name:  strings.TrimSpace(name),
			email: strings.TrimSpace(customer.GetString("email")),
		}

		customerById[customer.Id] = entry
		if relatedOrderId != "" {
			customerByOrderId[relatedOrderId] = entry
		}
	}

	frameItems, err := fetchRecordsByIds(app, "order_frame_items", frameItemIds)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to load frame items.",
			"details": err.Error(),
		})
	}

	paperweights, err := fetchRecordsByIds(app, "order_paperweight_items", paperweightItemIds)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to load paperweight items.",
			"details": err.Error(),
		})
	}

	emailLogs, err := fetchRecordsByField(app, "email_logs", "orderId", orderIds)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to load email logs.",
			"details": err.Error(),
		})
	}

	payments, err := fetchRecordsByField(app, "order_payments", "orderId", orderIds)
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to load order payments.",
			"details": err.Error(),
		})
	}

	// ---- Frame lookup by id ----
	frameById := map[string]*core.Record{}
	for _, f := range frameItems {
		frameById[f.Id] = f
	}

	// ---- Frames by order (use order.frameOrderId ordering) ----
	framesByOrderId := map[string][]*core.Record{}
	for _, order := range orders {
		oid := order.Id
		frameIds := order.GetStringSlice("frameOrderId")
		if len(frameIds) == 0 {
			continue
		}

		list := make([]*core.Record, 0, len(frameIds))
		for _, fid := range frameIds {
			fid = strings.TrimSpace(fid)
			if fid == "" {
				continue
			}
			if fr, ok := frameById[fid]; ok && fr != nil {
				list = append(list, fr)
			}
		}
		framesByOrderId[oid] = list
	}

	// ---- Map paperweight by order ----
	paperweightByOrderId := map[string]*core.Record{}
	for _, pw := range paperweights {
		oid := paperweightOrderMap[pw.Id]
		if strings.TrimSpace(oid) == "" {
			continue
		}
		paperweightByOrderId[oid] = pw
	}

	// ---- SentBy display map (superusers) ----
	sentByIds := uniqueNonEmptyStrings(func() []string {
		out := make([]string, 0, len(emailLogs))
		for _, log := range emailLogs {
			id := strings.TrimSpace(log.GetString("sentBy"))
			if id != "" {
				out = append(out, id)
			}
		}
		return out
	}())

	sentByDisplayById := map[string]sentByDisplay{}
	if len(sentByIds) > 0 {
		sentByRecords, err := fetchRecordsByIds(app, "_superusers", sentByIds)
		if err == nil {
			for _, r := range sentByRecords {
				email := strings.TrimSpace(r.GetString("email"))
				name := strings.TrimSpace(r.GetString("name"))
				if name == "" {
					name = strings.TrimSpace(r.GetString("username"))
				}
				sentByDisplayById[r.Id] = sentByDisplay{name: name, email: email}
			}
		}
	}

	// Also load any missing customers referenced by logs (fallback)
	customerIdsFromLogs := uniqueNonEmptyStrings(func() []string {
		out := []string{}
		for _, log := range emailLogs {
			cid := strings.TrimSpace(log.GetString("customerId"))
			if cid != "" {
				out = append(out, cid)
			}
		}
		return out
	}())

	missingCustomerIds := []string{}
	for _, cid := range customerIdsFromLogs {
		if _, ok := customerById[cid]; !ok {
			missingCustomerIds = append(missingCustomerIds, cid)
		}
	}
	if len(missingCustomerIds) > 0 {
		moreCustomers, err := fetchRecordsByIds(app, "customers", missingCustomerIds)
		if err == nil {
			for _, customer := range moreCustomers {
				name := strings.TrimSpace(strings.Join([]string{
					customer.GetString("title"),
					customer.GetString("firstName"),
					customer.GetString("surname"),
				}, " "))
				customerById[customer.Id] = orderExportCustomer{
					id:    customer.Id,
					name:  strings.TrimSpace(name),
					email: strings.TrimSpace(customer.GetString("email")),
				}
			}
		}
	}

	// ---- Payments summary by order ----
	paymentsByOrderId := map[string]orderPaymentSummary{}
	for _, payment := range payments {
		oid := strings.TrimSpace(payment.GetString("orderId"))
		if oid == "" {
			continue
		}
		entry := paymentsByOrderId[oid]
		entry.paidTotal += payment.GetFloat("amount")

		if payment.GetString("paymentType") == "final_balance" {
			dateValue := paymentDateValue(payment)
			if shouldReplaceFinalPaidOn(entry.finalPaidOn, dateValue) {
				entry.finalPaidOn = dateValue
			}
		}

		paymentsByOrderId[oid] = entry
	}

	// ---- XLSX ----
	file := excelize.NewFile()

	// Default tab (renamed from Sheet1)
	defaultSheetName := "Production Overview"
	file.SetSheetName("Sheet1", defaultSheetName)
	writeProductionOverviewSheet(
		file,
		defaultSheetName,
		orders,
		orderNoById,
		customerByOrderId,
		framesByOrderId,
		paperweightByOrderId,
		paymentsByOrderId,
	)

	// Other sheets
	file.NewSheet("Orders")
	writeOrdersSheet(file, orders, customerByOrderId, framesByOrderId)
	writeFrameItemsSheet(file, frameItems, frameItemOrderMap, orderNoById, customerByOrderId)
	writePaperweightsSheet(file, paperweights, paperweightOrderMap, orderNoById, customerByOrderId)
	writeEmailLogsSheet(file, emailLogs, orderNoById, customerByOrderId, customerById, sentByDisplayById)

	// Freeze headers
	freezeHeaderRow(file, defaultSheetName)
	freezeHeaderRow(file, "Orders")
	freezeHeaderRow(file, "Frame Items")
	freezeHeaderRow(file, "Paperweights")
	freezeHeaderRow(file, "Email Logs")

	// Make default sheet active
	if idx, err := file.GetSheetIndex(defaultSheetName); err == nil {
		file.SetActiveSheet(idx)
	}

	buffer, err := file.WriteToBuffer()
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to generate XLSX.",
			"details": err.Error(),
		})
	}

	loc, tzErr := time.LoadLocation("Europe/London")
	if tzErr != nil {
		loc = time.UTC
	}
	filename := fmt.Sprintf("orders-export-%s.xlsx", time.Now().In(loc).Format("20060102"))

	e.Response.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	e.Response.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	e.Response.Header().Set("Cache-Control", "no-store")
	e.Response.Header().Set("Pragma", "no-cache")
	e.Response.WriteHeader(http.StatusOK)
	_, _ = e.Response.Write(buffer.Bytes())

	return nil
}

func freezeHeaderRow(file *excelize.File, sheet string) {
	_ = file.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		Split:       true,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})
}

func writeProductionOverviewSheet(
	file *excelize.File,
	sheet string,
	orders []*core.Record,
	orderNoById map[string]int,
	customerByOrderId map[string]orderExportCustomer,
	framesByOrderId map[string][]*core.Record,
	paperweightByOrderId map[string]*core.Record,
	paymentsByOrderId map[string]orderPaymentSummary,
) {
	// max frames across the export
	maxFrames := 0
	for _, order := range orders {
		oid := order.Id
		if n := len(framesByOrderId[oid]); n > maxFrames {
			maxFrames = n
		}
	}

	leftHeaders := []string{
		"Married name",
		"Email",
		"Order no",
		"Occasion date",
		"Order ID",
		"Booking date",
		"Required by date",
		"Artist hours",
	}

	frameHeaders := []string{}
	for i := 1; i <= maxFrames; i++ {
		frameHeaders = append(frameHeaders,
			fmt.Sprintf("Frame %d size", i),
			fmt.Sprintf("Frame %d style", i),
			fmt.Sprintf("Frame %d glass type", i),
			fmt.Sprintf("Frame %d mount colour", i),
			fmt.Sprintf("Frame %d preservation type", i),
		)
	}

	rightHeaders := []string{
		"Artwork complete",
		"Framing complete",
		"Total frames",
		"Order total (£)",
		"Balance due (£)",
		"Order paid on (final balance)",
		"Delivered / collected",
		"Paperweight quantity",
		"Paperweight received",
		"Paperweight price (£)",
	}

	headers := append(append(leftHeaders, frameHeaders...), rightHeaders...)
	writeHeaderRow(file, sheet, headers)
	applyCurrencyColumnStyle(file, sheet, indexOfHeader(headers, "Order total (£)"))
	applyCurrencyColumnStyle(file, sheet, indexOfHeader(headers, "Balance due (£)"))

	for i, order := range orders {
		row := i + 2
		oid := order.Id
		customer := customerByOrderId[oid]

		frames := framesByOrderId[oid]
		pw := paperweightByOrderId[oid]

		allArtworkComplete := true
		allFramingComplete := true
		if len(frames) == 0 {
			allArtworkComplete = false
			allFramingComplete = false
		} else {
			for _, f := range frames {
				if !f.GetBool("artworkComplete") {
					allArtworkComplete = false
				}
				if !f.GetBool("framingComplete") {
					allFramingComplete = false
				}
			}
		}

		// Delivered / Collected (derived from quantities you already export elsewhere)
		deliveredCollected := ""
		deliveryQty := order.GetFloat("deliveryQty")
		collectionQty := order.GetFloat("collectionQty")
		switch {
		case deliveryQty > 0:
			deliveredCollected = "Delivered"
		case collectionQty > 0:
			deliveredCollected = "Collected"
		}

		orderTotal := calculateOrderTotal(order, frames, pw)
		payments := paymentsByOrderId[oid]
		paidTotal := payments.paidTotal
		balanceDue := orderTotal - paidTotal
		if balanceDue < 0 {
			balanceDue = 0
		}

		paidOn := payments.finalPaidOn

		bookingDate := getStringFirst(order, "bookingDate", "booking_date", "created")
		requiredBy := getStringFirst(order, "requiredByDate", "required_by_date", "requiredBy", "required_by")
		artistHours := getStringFirst(order, "artistHours")

		leftValues := []any{
			customer.name,
			customer.email,
			orderNoById[oid],
			exportDateDMY(order.GetString("occasionDate")),
			oid,
			exportDateDMY(bookingDate),
			exportDateDMY(requiredBy),
			artistHours,
		}

		frameValues := []any{}
		for idx := 0; idx < maxFrames; idx++ {
			if idx < len(frames) && frames[idx] != nil {
				f := frames[idx]
				extras := readExtrasMap(f.Get("extras"))
				frameValues = append(frameValues,
					formatFrameSizeInches(extras, f),
					f.GetString("frameType"),
					f.GetString("glassType"),
					f.GetString("frameMountColour"),
					f.GetString("preservationType"),
				)
			} else {
				frameValues = append(frameValues, "", "", "", "", "")
			}
		}

		pwQty := ""
		pwReceived := ""
		pwPrice := ""
		if pw != nil {
			qty := pw.GetInt("quantity")
			pwQty = fmtInt(qty)
			pwReceived = fmtBool(pw.GetBool("paperweightReceived"))
			pwPrice = fmtMoney(paperweightUnitPrice(pw.GetFloat("price"), qty))
		}

		rightValues := []any{
			fmtBool(allArtworkComplete),
			fmtBool(allFramingComplete),
			len(frames),
			orderTotal,
			balanceDue,
			exportDateDMY(paidOn),
			deliveredCollected,
			pwQty,
			pwReceived,
			pwPrice,
		}

		values := append(append(leftValues, frameValues...), rightValues...)
		writeRow(file, sheet, row, values)
	}
}

func fmtBool(v bool) string {
	if v {
		return "Yes"
	}
	return "No"
}

func fmtInt(v int) string {
	if v == 0 {
		return ""
	}
	return strconv.Itoa(v)
}

func fmtMoney(v float64) string {
	if v == 0 {
		return ""
	}
	return fmt.Sprintf("£%.2f", v)
}

func applyCurrencyColumnStyle(file *excelize.File, sheet string, colIndex int) {
	if colIndex <= 0 {
		return
	}
	currencyFormat := "£#,##0.00"
	styleID, err := file.NewStyle(&excelize.Style{
		CustomNumFmt: &currencyFormat,
	})
	if err != nil {
		return
	}
	colName, err := excelize.ColumnNumberToName(colIndex)
	if err != nil {
		return
	}
	_ = file.SetColStyle(sheet, colName, styleID)
}

func indexOfHeader(headers []string, target string) int {
	for idx, header := range headers {
		if header == target {
			return idx + 1
		}
	}
	return 0
}

// for number cells (so Excel can sum/sort)
func fmtMoneyNumber(v float64) float64 {
	return v
}

func formatFrameSizeInches(extras map[string]any, frame *core.Record) string {
	wAny := extras["recommendedSizeWidthIn"]
	hAny := extras["recommendedSizeHeightIn"]
	w, wOk := coerceFloat(wAny)
	h, hOk := coerceFloat(hAny)

	// fallback to measured
	if !wOk || !hOk || w <= 0 || h <= 0 {
		wAny = extras["measuredWidthIn"]
		hAny = extras["measuredHeightIn"]
		w, wOk = coerceFloat(wAny)
		h, hOk = coerceFloat(hAny)
	}

	if wOk && hOk && w > 0 && h > 0 {
		return fmt.Sprintf("%s x %s inches", fmtNumberNoTrailingZero(w), fmtNumberNoTrailingZero(h))
	}

	// last-resort fallbacks if you store size fields directly on the frame record
	sizeX := strings.TrimSpace(frame.GetString("sizeX"))
	sizeY := strings.TrimSpace(frame.GetString("sizeY"))
	if sizeX != "" && sizeY != "" {
		return fmt.Sprintf("%s x %s inches", sizeX, sizeY)
	}

	return ""
}

func fmtNumberNoTrailingZero(v float64) string {
	// If whole number, no decimals
	if v == float64(int64(v)) {
		return strconv.FormatInt(int64(v), 10)
	}
	return strconv.FormatFloat(v, 'f', 2, 64)
}

func calculateOrderTotal(order *core.Record, frames []*core.Record, pw *core.Record) float64 {
	frameTotal := 0.0
	for _, f := range frames {
		if f == nil {
			continue
		}
		frameTotal += f.GetFloat("price")
	}

	paperweightTotal := 0.0
	if pw != nil {
		paperweightTotal = pw.GetFloat("price")
	}

	extrasTotal := 0.0
	extrasTotal += order.GetFloat("replacementFlowersPrice")
	extrasTotal += order.GetFloat("collectionPrice")
	extrasTotal += order.GetFloat("deliveryPrice")
	extrasTotal += order.GetFloat("returnUnusedFlowersPrice")

	subTotal := frameTotal + paperweightTotal + extrasTotal
	vatTotal := subTotal * 0.2
	return subTotal + vatTotal
}

func getStringFirst(r *core.Record, keys ...string) string {
	for _, k := range keys {
		v := strings.TrimSpace(r.GetString(k))
		if v != "" {
			return v
		}
	}
	return ""
}

func getFloatFirst(r *core.Record, keys ...string) float64 {
	for _, k := range keys {
		v := r.GetFloat(k)
		if v != 0 {
			return v
		}
	}
	return 0
}

func paperweightUnitPrice(total float64, qty int) float64 {
	if qty <= 0 {
		return total
	}
	return total / float64(qty)
}

func paymentDateValue(payment *core.Record) string {
	paidAt := strings.TrimSpace(payment.GetString("paidAt"))
	if paidAt != "" {
		return paidAt
	}
	return strings.TrimSpace(payment.GetString("created"))
}

func shouldReplaceFinalPaidOn(existing, candidate string) bool {
	if strings.TrimSpace(candidate) == "" {
		return false
	}
	if strings.TrimSpace(existing) == "" {
		return true
	}
	existingTime, existingOk := parseDateTime(existing)
	candidateTime, candidateOk := parseDateTime(candidate)
	if existingOk && candidateOk {
		return candidateTime.After(existingTime)
	}
	return false
}

func parseDateTime(value string) (time.Time, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, false
	}
	layouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999Z07:00",
		"2006-01-02 15:04:05.999Z",
		"2006-01-02 15:04:05.999",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, trimmed); err == nil {
			return parsed, true
		}
	}
	if strings.Contains(trimmed, " ") {
		parts := strings.Split(trimmed, " ")
		if len(parts) > 0 {
			if parsed, err := time.Parse("2006-01-02", parts[0]); err == nil {
				return parsed, true
			}
		}
	}
	return time.Time{}, false
}

func buildOrdersFilter(orderId, fromParam, toParam, paymentStatus, orderStatus string) (string, error) {
	filters := []string{`isDeleted = false`}

	if orderId != "" {
		filters = append(filters, fmt.Sprintf(`id = "%s"`, escapeFilterValue(orderId)))
	} else {
		fromTime, toTime, err := resolveDateRange(fromParam, toParam)
		if err != nil {
			return "", err
		}
		filters = append(filters,
			fmt.Sprintf(`created >= "%s"`, fromTime.Format("2006-01-02 15:04:05")),
			fmt.Sprintf(`created <= "%s"`, toTime.Format("2006-01-02 15:04:05")),
		)
	}

	if paymentStatus != "" {
		filters = append(filters, fmt.Sprintf(`payment_status = "%s"`, escapeFilterValue(paymentStatus)))
	}

	if orderStatus != "" {
		filters = append(filters, fmt.Sprintf(`orderStatus = "%s"`, escapeFilterValue(orderStatus)))
	}

	return strings.Join(filters, " && "), nil
}

func resolveDateRange(fromParam, toParam string) (time.Time, time.Time, error) {
	now := time.Now().UTC()

	parseDate := func(value string) (time.Time, error) {
		parsed, err := time.Parse("2006-01-02", value)
		if err != nil {
			return time.Time{}, fmt.Errorf("Invalid date format: %s (expected YYYY-MM-DD)", value)
		}
		return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC), nil
	}

	var from time.Time
	var to time.Time

	switch {
	case fromParam == "" && toParam == "":
		to = now
		from = now.AddDate(0, 0, -30)
	case fromParam != "" && toParam == "":
		var err error
		from, err = parseDate(fromParam)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		to = now
	case fromParam == "" && toParam != "":
		var err error
		toStart, err := parseDate(toParam)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		to = time.Date(toStart.Year(), toStart.Month(), toStart.Day(), 23, 59, 59, 0, time.UTC)
		from = to.AddDate(0, 0, -30)
	default:
		var err error
		from, err = parseDate(fromParam)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		toStart, err := parseDate(toParam)
		if err != nil {
			return time.Time{}, time.Time{}, err
		}
		to = time.Date(toStart.Year(), toStart.Month(), toStart.Day(), 23, 59, 59, 0, time.UTC)
	}

	return from, to, nil
}

func fetchRecordsByIds(app *pocketbase.PocketBase, collection string, ids []string) ([]*core.Record, error) {
	return fetchRecordsByField(app, collection, "id", ids)
}

func fetchRecordsByField(app *pocketbase.PocketBase, collection, field string, ids []string) ([]*core.Record, error) {
	if len(ids) == 0 {
		return []*core.Record{}, nil
	}

	result := []*core.Record{}
	for start := 0; start < len(ids); start += filterChunkSize {
		end := min(start+filterChunkSize, len(ids))

		filter := buildOrFilter(field, ids[start:end])
		if filter == "" {
			continue
		}

		records, err := app.FindRecordsByFilter(collection, filter, "", len(ids[start:end]), 0)
		if err != nil {
			return nil, err
		}
		result = append(result, records...)
	}

	return result, nil
}

func buildOrFilter(field string, ids []string) string {
	conds := make([]string, 0, len(ids))
	for _, id := range ids {
		if strings.TrimSpace(id) == "" {
			continue
		}
		conds = append(conds, fmt.Sprintf(`%s = "%s"`, field, escapeFilterValue(id)))
	}

	if len(conds) == 0 {
		return ""
	}
	if len(conds) == 1 {
		return conds[0]
	}
	return "(" + strings.Join(conds, " || ") + ")"
}

func escapeFilterValue(value string) string {
	return strings.ReplaceAll(value, `"`, `\"`)
}

func writeOrdersSheet(
	file *excelize.File,
	orders []*core.Record,
	customerByOrderId map[string]orderExportCustomer,
	framesByOrderId map[string][]*core.Record,
) {
	headers := []string{
		"Order No",
		"Created",
		"Updated",
		"Occasion Date",
		"Customer Name",
		"Customer Email",
		"Order Status",
		"Payment Status",
		"Replacement Flowers",
		"Replacement Flowers Qty",
		"Replacement Flowers Price",
		"Collection Qty",
		"Collection Price",
		"Delivery Qty",
		"Delivery Price",
		"Return Unused Flowers",
		"Return Unused Flowers Price",
		"Artist Hours",
		"Notes",
		"Frames",
	}

	writeHeaderRow(file, "Orders", headers)

	for i, order := range orders {
		row := i + 2
		customer := customerByOrderId[order.Id]
		values := []any{
			order.GetInt("orderNo"),
			exportDateDMY(order.GetString("created")),
			exportDateDMY(order.GetString("updated")),
			exportDateDMY(order.GetString("occasionDate")),
			customer.name,
			customer.email,
			order.GetString("orderStatus"),
			order.GetString("payment_status"),
			order.GetBool("replacementFlowers"),
			order.GetFloat("replacementFlowersQty"),
			exportMoneyNumber(order.GetFloat("replacementFlowersPrice")),
			order.GetFloat("collectionQty"),
			exportMoneyNumber(order.GetFloat("collectionPrice")),
			order.GetFloat("deliveryQty"),
			exportMoneyNumber(order.GetFloat("deliveryPrice")),
			order.GetBool("returnUnusedFlowers"),
			exportMoneyNumber(order.GetFloat("returnUnusedFlowersPrice")),
			order.GetString("artistHours"),
			order.GetString("notes"),
			buildFramesSummary(framesByOrderId[order.Id]),
		}
		writeRow(file, "Orders", row, values)
	}
}

func buildFramesSummary(frames []*core.Record) string {
	if len(frames) == 0 {
		return ""
	}
	parts := make([]string, 0, len(frames))
	for i, f := range frames {
		if f == nil {
			continue
		}
		extras := readExtrasMap(f.Get("extras"))
		size := formatFrameSizeInches(extras, f)
		style := strings.TrimSpace(f.GetString("frameType"))
		layout := strings.TrimSpace(f.GetString("layout"))

		chunks := []string{}
		if size != "" {
			chunks = append(chunks, size)
		}
		if style != "" {
			chunks = append(chunks, style)
		}
		if layout != "" {
			chunks = append(chunks, layout)
		}

		desc := strings.Join(chunks, " | ")
		if desc == "" {
			desc = fmt.Sprintf("Frame %d", i+1)
		} else {
			desc = fmt.Sprintf("Frame %d: %s", i+1, desc)
		}
		parts = append(parts, desc)
	}
	return strings.Join(parts, " ; ")
}

func writeFrameItemsSheet(
	file *excelize.File,
	frames []*core.Record,
	frameItemOrderMap map[string]string,
	orderNoById map[string]int,
	customerByOrderId map[string]orderExportCustomer,
) {
	sheet := "Frame Items"
	file.NewSheet(sheet)

	headers := []string{
		"Order ID",
		"Order No",
		"Customer Name",
		"Customer Email",
		"Frame item ID",
		"Frame type",
		"Layout",
		"Measured width (in)",
		"Measured height (in)",
		"Recommended width (in)",
		"Recommended height (in)",
		"Preservation type",
		"Glass type",
		"Frame mount colour",
		"Inclusions",
		"Glass engraving",
		"Artwork complete",
		"Framing complete",
		"Preservation date",
		"Price",
		"Frame price",
		"Mount price",
		"Glass engraving price",
		"Glass price",
		"Created",
		"Updated",
	}

	writeHeaderRow(file, sheet, headers)

	for i, frame := range frames {
		row := i + 2
		orderId := frameItemOrderMap[frame.Id]
		customer := customerByOrderId[orderId]
		extras := readExtrasMap(frame.Get("extras"))

		values := []any{
			orderId,
			orderNoById[orderId],
			customer.name,
			customer.email,
			frame.Id,
			frame.GetString("frameType"),
			frame.GetString("layout"),
			exportExtrasValue("measuredWidthIn", extras["measuredWidthIn"]),
			exportExtrasValue("measuredHeightIn", extras["measuredHeightIn"]),
			exportExtrasValue("recommendedSizeWidthIn", extras["recommendedSizeWidthIn"]),
			exportExtrasValue("recommendedSizeHeightIn", extras["recommendedSizeHeightIn"]),
			frame.GetString("preservationType"),
			frame.GetString("glassType"),
			frame.GetString("frameMountColour"),
			frame.GetString("inclusions"),
			frame.GetString("glassEngraving"),
			frame.GetBool("artworkComplete"),
			frame.GetBool("framingComplete"),
			exportDateDMY(frame.GetString("preservationDate")),
			exportMoneyNumber(frame.GetFloat("price")),
			exportExtrasValue("framePrice", extras["framePrice"]),
			exportExtrasValue("mountPrice", extras["mountPrice"]),
			exportExtrasValue("glassEngravingPrice", extras["glassEngravingPrice"]),
			exportExtrasValue("glassPrice", extras["glassPrice"]),
			exportDateDMY(frame.GetString("created")),
			exportDateDMY(frame.GetString("updated")),
		}
		writeRow(file, sheet, row, values)
	}
}

func writePaperweightsSheet(
	file *excelize.File,
	paperweights []*core.Record,
	paperweightOrderMap map[string]string,
	orderNoById map[string]int,
	customerByOrderId map[string]orderExportCustomer,
) {
	sheet := "Paperweights"
	file.NewSheet(sheet)

	headers := []string{
		"Order ID",
		"Order No",
		"Customer Name",
		"Customer Email",
		"Paperweight item ID",
		"Quantity",
		"Price",
		"Paperweight received",
		"Created",
		"Updated",
	}

	writeHeaderRow(file, sheet, headers)

	for i, pw := range paperweights {
		row := i + 2
		orderId := paperweightOrderMap[pw.Id]
		customer := customerByOrderId[orderId]
		qty := pw.GetInt("quantity")

		values := []any{
			orderId,
			orderNoById[orderId],
			customer.name,
			customer.email,
			pw.Id,
			qty,
			exportMoneyNumber(paperweightUnitPrice(pw.GetFloat("price"), qty)),
			pw.GetBool("paperweightReceived"),
			exportDateDMY(pw.GetString("created")),
			exportDateDMY(pw.GetString("updated")),
		}
		writeRow(file, sheet, row, values)
	}
}

func writeEmailLogsSheet(
	file *excelize.File,
	logs []*core.Record,
	orderNoById map[string]int,
	customerByOrderId map[string]orderExportCustomer,
	customerById map[string]orderExportCustomer,
	sentByDisplayById map[string]sentByDisplay,
) {
	sheet := "Email Logs"
	file.NewSheet(sheet)

	headers := []string{
		"Email log ID",
		"Sent at",
		"Channel",
		"Status",
		"Email type",
		"Event type",
		"Event note",
		"Template key",
		"To name",
		"To email",
		"Subject",
		"Sent by",
		"Order ID",
		"Order No",
		"Customer name",
		"Frame item ID",
		"Paperweight item ID",
		"Error",
	}

	writeHeaderRow(file, sheet, headers)

	for i, log := range logs {
		row := i + 2

		oid := strings.TrimSpace(log.GetString("orderId"))
		cid := strings.TrimSpace(log.GetString("customerId"))

		customerName := ""
		if oid != "" {
			customerName = customerByOrderId[oid].name
		}
		if customerName == "" && cid != "" {
			customerName = customerById[cid].name
		}

		sentById := strings.TrimSpace(log.GetString("sentBy"))
		sentBy := ""
		if sentById != "" {
			if disp, ok := sentByDisplayById[sentById]; ok {
				sentBy = disp.String()
			}
		}

		orderNo := 0
		if oid != "" {
			orderNo = orderNoById[oid]
		}

		values := []any{
			log.Id,
			exportDateDMY(log.GetString("sentAt")),
			log.GetString("channel"),
			log.GetString("status"),
			log.GetString("emailType"),
			log.GetString("eventType"),
			log.GetString("eventNote"),
			log.GetString("templateKey"),
			log.GetString("toName"),
			log.GetString("toEmail"),
			log.GetString("subject"),
			sentBy,
			oid,
			orderNo,
			customerName,
			log.GetString("frameItemId"),
			log.GetString("paperweightItemId"),
			log.GetString("error"),
		}

		writeRow(file, sheet, row, values)
	}
}

func writeHeaderRow(file *excelize.File, sheet string, headers []string) {
	writeRow(file, sheet, 1, sliceAny(headers))
}

func writeRow(file *excelize.File, sheet string, row int, values []any) {
	for colIndex, value := range values {
		cell, err := excelize.CoordinatesToCellName(colIndex+1, row)
		if err != nil {
			continue
		}
		_ = file.SetCellValue(sheet, cell, value)
	}
}

func sliceAny(values []string) []any {
	result := make([]any, len(values))
	for i, value := range values {
		result[i] = value
	}
	return result
}

func stringifyJSON(value any) string {
	if value == nil {
		return ""
	}
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(data)
}

func exportDateDMY(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	layouts := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999Z07:00",
		"2006-01-02 15:04:05.999Z",
		"2006-01-02 15:04:05.999",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, trimmed); err == nil {
			return parsed.Format("02-01-2006")
		}
	}

	if strings.Contains(trimmed, " ") {
		parts := strings.Split(trimmed, " ")
		if len(parts) > 0 {
			if parsed, err := time.Parse("2006-01-02", parts[0]); err == nil {
				return parsed.Format("02-01-2006")
			}
		}
	}

	return trimmed
}

func exportMoneyNumber(value float64) float64 { return value }

func readExtrasMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}

	switch cast := value.(type) {
	case map[string]any:
		return cast
	case map[string]json.RawMessage:
		result := make(map[string]any, len(cast))
		for key, raw := range cast {
			var decoded any
			if err := json.Unmarshal(raw, &decoded); err == nil {
				result[key] = decoded
			}
		}
		return result
	case string:
		if strings.TrimSpace(cast) == "" {
			return map[string]any{}
		}
		var result map[string]any
		if err := json.Unmarshal([]byte(cast), &result); err == nil {
			return result
		}
	case []byte:
		if len(cast) == 0 {
			return map[string]any{}
		}
		var result map[string]any
		if err := json.Unmarshal(cast, &result); err == nil {
			return result
		}
	case json.RawMessage:
		if len(cast) == 0 {
			return map[string]any{}
		}
		var result map[string]any
		if err := json.Unmarshal(cast, &result); err == nil {
			return result
		}
	default:
		data, err := json.Marshal(value)
		if err == nil {
			var result map[string]any
			if err := json.Unmarshal(data, &result); err == nil {
				return result
			}
		}
	}

	return map[string]any{}
}

func exportExtrasValue(key string, value any) any {
	if value == nil {
		return ""
	}

	if strings.HasSuffix(strings.ToLower(key), "price") {
		if number, ok := coerceFloat(value); ok {
			return exportMoneyNumber(number)
		}
		if str, ok := value.(string); ok {
			return str
		}
		return ""
	}

	if number, ok := coerceFloat(value); ok {
		return number
	}
	if str, ok := value.(string); ok {
		return str
	}

	return stringifyJSON(value)
}

func coerceFloat(value any) (float64, bool) {
	switch cast := value.(type) {
	case float64:
		return cast, true
	case float32:
		return float64(cast), true
	case int:
		return float64(cast), true
	case int64:
		return float64(cast), true
	case int32:
		return float64(cast), true
	case uint:
		return float64(cast), true
	case uint64:
		return float64(cast), true
	case uint32:
		return float64(cast), true
	case json.Number:
		number, err := cast.Float64()
		if err != nil {
			return 0, false
		}
		return number, true
	case string:
		trimmed := strings.TrimSpace(cast)
		if trimmed == "" {
			return 0, false
		}
		number, err := strconv.ParseFloat(trimmed, 64)
		if err != nil {
			return 0, false
		}
		return number, true
	default:
		return 0, false
	}
}

func uniqueNonEmptyStrings(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v == "" {
			continue
		}
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
	}
	return out
}
