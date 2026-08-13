package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

type smsSendRequest struct {
	OrderId      string `json:"orderId"`
	Type         string `json:"type"`
	Message      string `json:"message"`
	Sender       string `json:"sender"`
	BalanceDue   string `json:"balanceDue"`
	TotalBalance string `json:"totalBalance"`
}

type webexInteractSmsRequest struct {
	MessageBody string `json:"message_body"`
	From        string `json:"from"`
	To          []struct {
		Phone []string `json:"phone"`
	} `json:"to"`
}

type webexInteractSmsResponse struct {
	RequestID string `json:"request_id"`
	Messages  []struct {
		TransactionID string `json:"transaction_id"`
		To            string `json:"to"`
		Status        string `json:"status"`
		Code          int    `json:"code"`
	} `json:"messages"`
	Errors []struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"errors"`
	Message string `json:"message"`
}

const webexInteractSmsEndpoint = "https://api.webexinteract.com/v1/sms"

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

		apiKey := strings.TrimSpace(os.Getenv("WEBEX_INTERACT_ACCESS_TOKEN"))
		if apiKey == "" {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":    false,
				"error": "WEBEX_INTERACT_ACCESS_TOKEN is not configured.",
			})
		}
		sender := strings.TrimSpace(payload.Sender)
		if sender == "" {
			sender = strings.TrimSpace(os.Getenv("WEBEX_INTERACT_SENDER"))
		}
		if sender == "" {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":    false,
				"error": "WEBEX_INTERACT_SENDER is not configured.",
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
			Provider:   "webex_interact",
			Status:     "failed",
			SentAt:     sentAt,
		})

		providerMessageId, sendErr := sendWebexInteractSMS(
			&http.Client{Timeout: 10 * time.Second},
			webexInteractSmsEndpoint,
			apiKey,
			sender,
			providerNumber,
			finalMessage,
		)
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
			"provider": "webex_interact",
		})
	}).Bind(apis.RequireAuth())
}

func isAllowedSmsType(value string) bool {
	switch value {
	case "chase_to_choose", "order_ready", "invite_to_pay_final_balance", "custom":
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
	provider := ""
	switch {
	case hasPlus:
		provider = "+" + digits
	case strings.HasPrefix(digits, "00"):
		provider = "+" + strings.TrimPrefix(digits, "00")
	case strings.HasPrefix(digits, "07") && len(digits) == 11:
		provider = "+44" + strings.TrimPrefix(digits, "0")
	case strings.HasPrefix(digits, "44"):
		provider = "+" + digits
	default:
		return "", "", fmt.Errorf("Customer phone number must include a country code.")
	}
	return provider, provider, nil
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

func sendWebexInteractSMS(client *http.Client, endpoint, accessToken, sender, toNumber, message string) (string, error) {
	payload := webexInteractSmsRequest{
		MessageBody: message,
		From:        sender,
		To: []struct {
			Phone []string `json:"phone"`
		}{
			{Phone: []string{toNumber}},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-AUTH-KEY", accessToken)

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	var response webexInteractSmsResponse
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return "", fmt.Errorf("SMS provider returned an invalid response (HTTP %d)", resp.StatusCode)
	}

	if len(response.Errors) > 0 {
		return "", errors.New(response.Errors[0].Message)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		if strings.TrimSpace(response.Message) != "" {
			return "", errors.New(response.Message)
		}
		return "", fmt.Errorf("SMS provider error (HTTP %d)", resp.StatusCode)
	}
	if len(response.Messages) == 0 || strings.TrimSpace(response.Messages[0].TransactionID) == "" {
		return "", fmt.Errorf("SMS provider accepted no messages")
	}
	return response.Messages[0].TransactionID, nil
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
