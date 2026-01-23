package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

type smsSendRequest struct {
	OrderId        string `json:"orderId"`
	Type           string `json:"type"`
	Message        string `json:"message"`
	Sender         string `json:"sender"`
	BalanceDue     string `json:"balanceDue"`
	TotalBalance   string `json:"totalBalance"`
}

type txtlocalResponse struct {
	Status   string `json:"status"`
	Messages []struct {
		ID        string `json:"id"`
		Message   string `json:"message"`
		Recipient string `json:"recipient"`
	} `json:"messages"`
	Errors []struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"errors"`
}

func registerSmsRoutes(se *core.ServeEvent, app *pocketbase.PocketBase) {
	se.Router.POST("/api/sms/send", func(e *core.RequestEvent) error {
		var payload smsSendRequest
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		orderId := strings.TrimSpace(payload.OrderId)
		if orderId == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "orderId is required.",
			})
		}

		message := strings.TrimSpace(payload.Message)
		if message == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "message is required.",
			})
		}

		smsType := strings.TrimSpace(payload.Type)
		if smsType == "" {
			smsType = "custom"
		}
		if !isAllowedSmsType(smsType) {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Invalid SMS type.",
			})
		}

		apiKey := strings.TrimSpace(os.Getenv("TXTLOCAL_API_KEY"))
		if apiKey == "" {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":    false,
				"error": "TXTLOCAL_API_KEY is not configured.",
			})
		}
		sender := strings.TrimSpace(payload.Sender)
		if sender == "" {
			sender = strings.TrimSpace(os.Getenv("TXTLOCAL_SENDER"))
		}
		if sender == "" {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":    false,
				"error": "TXTLOCAL_SENDER is not configured.",
			})
		}

		orderRec, err := app.FindRecordById("orders", orderId)
		if err != nil {
			return e.JSON(http.StatusNotFound, map[string]any{
				"ok":    false,
				"error": "Order not found.",
			})
		}

		customerRec, err := fetchCustomerByOrderId(app, orderId)
		if err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": err.Error(),
			})
		}

		phone := strings.TrimSpace(customerRec.GetString("telephone"))
		displayNumber, providerNumber, err := normalizePhoneNumber(phone)
		if err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": err.Error(),
			})
		}

		customerName := buildSmsCustomerName(
			customerRec.GetString("title"),
			customerRec.GetString("firstName"),
			customerRec.GetString("surname"),
		)
		firstName := strings.TrimSpace(customerRec.GetString("firstName"))
		if firstName == "" && customerName != "" {
			firstName = strings.Split(customerName, " ")[0]
		}
		orderNo := orderRec.GetInt("orderNo")

		replacements := map[string]string{
			"firstName":    firstName,
			"fullName":     customerName,
			"orderNo":      fmt.Sprintf("%d", orderNo),
			"balanceDue":   strings.TrimSpace(payload.BalanceDue),
			"totalBalance": strings.TrimSpace(payload.TotalBalance),
		}
		finalMessage := replaceTokens(message, replacements)
		sentAt := time.Now().Format(time.RFC3339)
		logRecord, _ := createSmsLog(app, e, smsLogParams{
			OrderId:    orderId,
			CustomerId: customerRec.Id,
			ToNumber:   displayNumber,
			Sender:     sender,
			Type:       smsType,
			Body:       finalMessage,
			Provider:   "txtlocal",
			Status:     "failed",
			SentAt:     sentAt,
		})

		providerMessageId, sendErr := sendTxtLocalSMS(apiKey, sender, providerNumber, finalMessage)
		if sendErr != nil {
			updateSmsLog(app, logRecord, "failed", sendErr.Error(), providerMessageId)
			updateOrderSmsStatus(orderRec, smsType, finalMessage, "failed", sendErr.Error(), "")
			_ = app.Save(orderRec)
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": sendErr.Error(),
			})
		}

		updateSmsLog(app, logRecord, "sent", "", providerMessageId)
		updateOrderSmsStatus(orderRec, smsType, finalMessage, "sent", "", sentAt)
		_ = app.Save(orderRec)

		return e.JSON(http.StatusOK, map[string]any{
			"ok":       true,
			"to":       displayNumber,
			"orderId":  orderId,
			"type":     smsType,
			"sentAt":   sentAt,
			"provider": "txtlocal",
		})
	}).Bind(apis.RequireAuth())
}

func isAllowedSmsType(value string) bool {
	switch value {
	case "deposit_reminder", "paperweight_received", "framing_complete", "custom":
		return true
	default:
		return false
	}
}

func normalizePhoneNumber(value string) (string, string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", "", fmt.Errorf("Customer phone number is missing.")
	}
	hasPlus := strings.HasPrefix(trimmed, "+")
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, trimmed)
	if len(digits) < 8 {
		return "", "", fmt.Errorf("Customer phone number looks invalid.")
	}
	display := digits
	if hasPlus {
		display = "+" + digits
	}
	return display, digits, nil
}

func replaceTokens(message string, tokens map[string]string) string {
	result := message
	for key, value := range tokens {
		result = strings.ReplaceAll(result, "{"+key+"}", value)
	}
	return result
}

func buildSmsCustomerName(title, firstName, surname string) string {
	parts := []string{
		strings.TrimSpace(title),
		strings.TrimSpace(firstName),
		strings.TrimSpace(surname),
	}
	out := []string{}
	for _, part := range parts {
		if part != "" {
			out = append(out, part)
		}
	}
	return strings.TrimSpace(strings.Join(out, " "))
}

func fetchCustomerByOrderId(app *pocketbase.PocketBase, orderId string) (*core.Record, error) {
	filter := fmt.Sprintf(`orderId = "%s"`, strings.ReplaceAll(orderId, `"`, `\"`))
	records, err := app.FindRecordsByFilter("customers", filter, "", 1, 0)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, fmt.Errorf("Customer not found for order.")
	}
	return records[0], nil
}

func sendTxtLocalSMS(apiKey, sender, toNumber, message string) (string, error) {
	values := url.Values{}
	values.Set("apikey", apiKey)
	values.Set("numbers", toNumber)
	values.Set("message", message)
	values.Set("sender", sender)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.PostForm("https://api.txtlocal.com/send/", values)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var payload txtlocalResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("SMS provider error (%d)", resp.StatusCode)
	}
	if strings.ToLower(payload.Status) != "success" {
		if len(payload.Errors) > 0 {
			return "", fmt.Errorf(payload.Errors[0].Message)
		}
		return "", fmt.Errorf("SMS provider error")
	}
	if len(payload.Messages) > 0 {
		return payload.Messages[0].ID, nil
	}

	return "", nil
}

type smsLogParams struct {
	OrderId    string
	CustomerId string
	ToNumber   string
	Sender     string
	Type       string
	Body       string
	Provider   string
	Status     string
	Error      string
	SentAt     string
}

func createSmsLog(app *pocketbase.PocketBase, e *core.RequestEvent, params smsLogParams) (*core.Record, error) {
	coll, err := app.FindCollectionByNameOrId("sms_logs")
	if err != nil {
		return nil, err
	}

	rec := core.NewRecord(coll)
	rec.Set("orderId", params.OrderId)
	if strings.TrimSpace(params.CustomerId) != "" {
		rec.Set("customerId", params.CustomerId)
	}
	rec.Set("toNumber", strings.TrimSpace(params.ToNumber))
	rec.Set("sender", strings.TrimSpace(params.Sender))
	rec.Set("type", strings.TrimSpace(params.Type))
	rec.Set("body", strings.TrimSpace(params.Body))
	rec.Set("provider", strings.TrimSpace(params.Provider))
	rec.Set("status", strings.TrimSpace(params.Status))
	rec.Set("error", strings.TrimSpace(params.Error))
	rec.Set("sentAt", strings.TrimSpace(params.SentAt))

	if err := app.Save(rec); err != nil {
		return nil, err
	}
	return rec, nil
}

func updateSmsLog(app *pocketbase.PocketBase, rec *core.Record, status string, errMsg string, providerMessageId string) {
	if rec == nil {
		return
	}
	if strings.TrimSpace(status) != "" {
		rec.Set("status", status)
	}
	if strings.TrimSpace(errMsg) != "" {
		rec.Set("error", errMsg)
	} else {
		rec.Set("error", "")
	}
	if strings.TrimSpace(providerMessageId) != "" {
		rec.Set("providerMessageId", providerMessageId)
	}
	_ = app.Save(rec)
}

func updateOrderSmsStatus(orderRec *core.Record, smsType, body, status, errMsg, sentAt string) {
	if orderRec == nil {
		return
	}
	if strings.TrimSpace(sentAt) != "" {
		orderRec.Set("lastSmsSentAt", sentAt)
	}
	orderRec.Set("lastSmsBody", strings.TrimSpace(body))
	orderRec.Set("lastSmsType", strings.TrimSpace(smsType))
	orderRec.Set("lastSmsStatus", strings.TrimSpace(status))
	if strings.TrimSpace(errMsg) != "" {
		orderRec.Set("lastSmsError", errMsg)
	} else {
		orderRec.Set("lastSmsError", "")
	}
}
