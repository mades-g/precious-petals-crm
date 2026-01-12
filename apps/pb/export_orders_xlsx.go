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

func handleOrdersExport(app *pocketbase.PocketBase, e *core.RequestEvent) error {
	query := e.Request.URL.Query()
	orderId := strings.TrimSpace(query.Get("orderId"))
	fromParam := strings.TrimSpace(query.Get("from"))
	toParam := strings.TrimSpace(query.Get("to"))
	paymentStatus := strings.TrimSpace(query.Get("paymentStatus"))
	orderStatus := strings.TrimSpace(query.Get("orderStatus"))

	filter, err := buildOrdersFilter(orderId, fromParam, toParam, paymentStatus, orderStatus)
	if err != nil {
		return e.JSON(http.StatusBadRequest, map[string]any{
			"ok":    false,
			"error": err.Error(),
		})
	}

	orders, err := app.FindRecordsByFilter(
		"orders",
		filter,
		"-created",
		maxOrdersExport+1,
		0,
	)
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

	orderIds := make([]string, 0, len(orders))
	orderNoById := map[string]int{}
	frameItemOrderMap := map[string]string{}
	paperweightOrderMap := map[string]string{}
	frameItemIds := []string{}
	paperweightItemIds := []string{}

	for _, order := range orders {
		orderId := order.Id
		orderIds = append(orderIds, orderId)
		orderNoById[orderId] = order.GetInt("orderNo")

		frameIds := order.GetStringSlice("frameOrderId")
		for _, frameId := range frameIds {
			if strings.TrimSpace(frameId) == "" {
				continue
			}
			frameItemIds = append(frameItemIds, frameId)
			frameItemOrderMap[frameId] = orderId
		}

		pwId := strings.TrimSpace(order.GetString("paperweightOrderId"))
		if pwId != "" {
			paperweightItemIds = append(paperweightItemIds, pwId)
			paperweightOrderMap[pwId] = orderId
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
	for _, customer := range customers {
		relatedOrderId := strings.TrimSpace(customer.GetString("orderId"))
		if relatedOrderId == "" {
			continue
		}
		name := strings.TrimSpace(strings.Join([]string{
			customer.GetString("title"),
			customer.GetString("firstName"),
			customer.GetString("surname"),
		}, " "))
		customerByOrderId[relatedOrderId] = orderExportCustomer{
			id:    customer.Id,
			name:  name,
			email: customer.GetString("email"),
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

	file := excelize.NewFile()
	file.SetSheetName("Sheet1", "Orders")
	writeOrdersSheet(file, orders, customerByOrderId)
	writeFrameItemsSheet(file, frameItems, frameItemOrderMap, orderNoById)
	writePaperweightsSheet(file, paperweights, paperweightOrderMap, orderNoById)
	writeEmailLogsSheet(file, emailLogs)

	buffer, err := file.WriteToBuffer()
	if err != nil {
		return e.JSON(http.StatusInternalServerError, map[string]any{
			"ok":      false,
			"error":   "Failed to generate XLSX.",
			"details": err.Error(),
		})
	}

	filename := fmt.Sprintf("orders-export-%s.xlsx", time.Now().Format("20060102"))
	e.Response.Header().Set(
		"Content-Type",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	)
	e.Response.Header().Set(
		"Content-Disposition",
		fmt.Sprintf("attachment; filename=%q", filename),
	)
	e.Response.Header().Set("Cache-Control", "no-store")
	e.Response.Header().Set("Pragma", "no-cache")
	e.Response.WriteHeader(http.StatusOK)
	_, _ = e.Response.Write(buffer.Bytes())

	return nil
}

func buildOrdersFilter(orderId, fromParam, toParam, paymentStatus, orderStatus string) (string, error) {
	filters := []string{}

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
		end := start + filterChunkSize
		if end > len(ids) {
			end = len(ids)
		}

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

func writeOrdersSheet(file *excelize.File, orders []*core.Record, customerByOrderId map[string]orderExportCustomer) {
	headers := []string{
		"orderId",
		"orderNo",
		"created",
		"updated",
		"occasionDate",
		"customerId",
		"customerName",
		"customerEmail",
		"billingAddressLine1",
		"billingAddressLine2",
		"billingTown",
		"billingCounty",
		"billingPostcode",
		"orderStatus",
		"payment_status",
		"replacementFlowers",
		"replacementFlowersQty",
		"replacementFlowersPrice",
		"collectionQty",
		"collectionPrice",
		"deliveryQty",
		"deliveryPrice",
		"returnUnusedFlowers",
		"returnUnusedFlowersPrice",
		"artistHours",
		"notes",
	}

	writeHeaderRow(file, "Orders", headers)

	for i, order := range orders {
		row := i + 2
		customer := customerByOrderId[order.Id]
		values := []any{
			order.Id,
			order.GetInt("orderNo"),
			exportDateDMY(order.GetString("created")),
			exportDateDMY(order.GetString("updated")),
			exportDateDMY(order.GetString("occasionDate")),
			customer.id,
			customer.name,
			customer.email,
			order.GetString("billingAddressLine1"),
			order.GetString("billingAddressLine2"),
			order.GetString("billingTown"),
			order.GetString("billingCounty"),
			order.GetString("billingPostcode"),
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
		}
		writeRow(file, "Orders", row, values)
	}
}

func writeFrameItemsSheet(
	file *excelize.File,
	frames []*core.Record,
	frameItemOrderMap map[string]string,
	orderNoById map[string]int,
) {
	sheet := "Frame Items"
	file.NewSheet(sheet)

	headers := []string{
		"orderId",
		"orderNo",
		"frameItemId",
		"sizeX",
		"sizeY",
		"frameType",
		"layout",
		"preservationType",
		"glassType",
		"frameMountColour",
		"inclusions",
		"glassEngraving",
		"artworkComplete",
		"framingComplete",
		"preservationDate",
		"price",
		"framePrice",
		"mountPrice",
		"glassEngravingPrice",
		"glassPrice",
		"measuredWidthIn",
		"measuredHeightIn",
		"recommendedSizeWidthIn",
		"recommendedSizeHeightIn",
		"created",
		"updated",
	}

	writeHeaderRow(file, sheet, headers)

	for i, frame := range frames {
		row := i + 2
		orderId := frameItemOrderMap[frame.Id]
		extras := readExtrasMap(frame.Get("extras"))
		values := []any{
			orderId,
			orderNoById[orderId],
			frame.Id,
			frame.GetString("sizeX"),
			frame.GetString("sizeY"),
			frame.GetString("frameType"),
			frame.GetString("layout"),
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
			exportExtrasValue("measuredWidthIn", extras["measuredWidthIn"]),
			exportExtrasValue("measuredHeightIn", extras["measuredHeightIn"]),
			exportExtrasValue("recommendedSizeWidthIn", extras["recommendedSizeWidthIn"]),
			exportExtrasValue("recommendedSizeHeightIn", extras["recommendedSizeHeightIn"]),
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
) {
	sheet := "Paperweights"
	file.NewSheet(sheet)

	headers := []string{
		"orderId",
		"orderNo",
		"paperweightItemId",
		"quantity",
		"price",
		"paperweightReceived",
		"created",
		"updated",
	}

	writeHeaderRow(file, sheet, headers)

	for i, pw := range paperweights {
		row := i + 2
		orderId := paperweightOrderMap[pw.Id]
		values := []any{
			orderId,
			orderNoById[orderId],
			pw.Id,
			pw.GetInt("quantity"),
			exportMoneyNumber(pw.GetFloat("price")),
			pw.GetBool("paperweightReceived"),
			exportDateDMY(pw.GetString("created")),
			exportDateDMY(pw.GetString("updated")),
		}
		writeRow(file, sheet, row, values)
	}
}

func writeEmailLogsSheet(file *excelize.File, logs []*core.Record) {
	sheet := "Email Logs"
	file.NewSheet(sheet)

	headers := []string{
		"emailLogId",
		"sentAt",
		"channel",
		"status",
		"emailType",
		"eventType",
		"eventNote",
		"templateKey",
		"toName",
		"toEmail",
		"subject",
		"sentBy",
		"orderId",
		"customerId",
		"frameItemId",
		"paperweightItemId",
		"error",
		"meta",
	}

	writeHeaderRow(file, sheet, headers)

	for i, log := range logs {
		row := i + 2
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
			log.GetString("sentBy"),
			log.GetString("orderId"),
			log.GetString("customerId"),
			log.GetString("frameItemId"),
			log.GetString("paperweightItemId"),
			log.GetString("error"),
			stringifyJSON(log.Get("meta")),
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

func exportMoneyNumber(value float64) float64 {
	return value
}

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
