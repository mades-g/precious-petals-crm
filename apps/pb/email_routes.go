package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func registerEmailRoutes(
	se *core.ServeEvent,
	app *pocketbase.PocketBase,
	previewTemplatePath string,
	resend *ResendClient,
) {
	se.Router.POST("/api/email/invoice", func(e *core.RequestEvent) error {
		var payload invoicePayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		if strings.TrimSpace(payload.Customer.Email) == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Missing customer email.",
			})
		}

		subject := strings.TrimSpace(fmt.Sprintf("Invoice #%s", formatInvoiceNo(payload.Order.OrderNo.Float64())))
		if subject == "Invoice #-" {
			subject = "Invoice"
		}

		logCtx, meta := buildEmailLogContextFromPayload(payload, "invoice", "manual", "invoice")
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, payload.Customer.Email, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		view := buildInvoiceViewModel(payload)
		html, err := renderInvoiceTemplate(previewTemplatePath, view)
		if err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{"stage": "render_html"})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render invoice.",
				"details": err.Error(),
				"path":    previewTemplatePath,
			})
		}

		pdfStart := time.Now()
		pdfBytes, err := renderInvoicePdf(html)
		if err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{
				"stage":    "render_pdf",
				"pdfMs":    time.Since(pdfStart).Milliseconds(),
				"pdfBytes": 0,
			})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to generate invoice PDF.",
				"details": err.Error(),
			})
		}

		req := ResendEmailRequest{
			To:      []string{payload.Customer.Email},
			Subject: subject,
			HTML: fmt.Sprintf(
				"<p>Hi %s,</p><p>Please find your invoice attached.</p>",
				firstNonEmpty(payload.Customer.FirstName, "there"),
			),
			Text: fmt.Sprintf(
				"Hi %s,\n\nPlease find your invoice attached.\n",
				firstNonEmpty(payload.Customer.FirstName, "there"),
			),
			Attachments: []ResendAttachment{
				{
					Filename: "invoice.pdf",
					Content:  base64.StdEncoding.EncodeToString(pdfBytes),
				},
			},
		}

		// Use email log record id as idempotency key (best available stable key).
		idemKey := ""
		if logRec != nil && strings.TrimSpace(logRec.Id) != "" {
			idemKey = "email_log_" + logRec.Id
		}

		sendStart := time.Now()
		resp, sendErr := resend.SendEmail(e.Request.Context(), req, idemKey)
		if sendErr != nil {
			metaPatch := map[string]any{
				"stage":    "send_email",
				"sendMs":   time.Since(sendStart).Milliseconds(),
				"pdfBytes": len(pdfBytes),
			}
			if httpErr, ok := sendErr.(*ResendHTTPError); ok {
				metaPatch["resendStatus"] = httpErr.Status
				metaPatch["resendBody"] = httpErr.Body
			}
			updateEmailLog(app, logRec, "failed", sendErr.Error(), metaPatch)

			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to send invoice email.",
				"details": sendErr.Error(),
			})
		}

		updateEmailLog(app, logRec, "sent", "", map[string]any{
			"stage":          "sent",
			"sendMs":         time.Since(sendStart).Milliseconds(),
			"pdfBytes":       len(pdfBytes),
			"resendId":       resp.ID,
			"idempotencyKey": idemKey,
		})

		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}).Bind(apis.RequireAuth())

	se.Router.POST("/api/email/recommendation", func(e *core.RequestEvent) error {
		var payload invoicePayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		if strings.TrimSpace(payload.Customer.Email) == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Missing customer email.",
			})
		}

		subject := "Your bouquet recommendation"

		logCtx, meta := buildEmailLogContextFromPayload(payload, "recommendation_bouquet", "manual", "recommendation")
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, payload.Customer.Email, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		req := ResendEmailRequest{
			To:      []string{payload.Customer.Email},
			Subject: subject,
			HTML: fmt.Sprintf(
				"<p>Hi %s,</p><p>Your recommendation is ready. If you have any questions, reply to this email.</p>",
				firstNonEmpty(payload.Customer.FirstName, "there"),
			),
			Text: fmt.Sprintf(
				"Hi %s,\n\nYour recommendation is ready.\n",
				firstNonEmpty(payload.Customer.FirstName, "there"),
			),
		}

		idemKey := ""
		if logRec != nil && strings.TrimSpace(logRec.Id) != "" {
			idemKey = "email_log_" + logRec.Id
		}

		sendStart := time.Now()
		resp, sendErr := resend.SendEmail(e.Request.Context(), req, idemKey)
		if sendErr != nil {
			metaPatch := map[string]any{
				"stage":  "send_email",
				"sendMs": time.Since(sendStart).Milliseconds(),
			}
			if httpErr, ok := sendErr.(*ResendHTTPError); ok {
				metaPatch["resendStatus"] = httpErr.Status
				metaPatch["resendBody"] = httpErr.Body
			}
			updateEmailLog(app, logRec, "failed", sendErr.Error(), metaPatch)

			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to send recommendation email.",
				"details": sendErr.Error(),
			})
		}

		updateEmailLog(app, logRec, "sent", "", map[string]any{
			"stage":          "sent",
			"sendMs":         time.Since(sendStart).Milliseconds(),
			"resendId":       resp.ID,
			"idempotencyKey": idemKey,
		})

		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}).Bind(apis.RequireAuth())
}
