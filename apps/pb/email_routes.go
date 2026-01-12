package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/mailer"
)

func registerEmailRoutes(se *core.ServeEvent, app *pocketbase.PocketBase, previewTemplatePath string) {
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

		// create log entry (attempted) - best effort
		logCtx, meta := buildEmailLogContextFromPayload(payload, "invoice", "manual", "invoice")
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, payload.Customer.Email, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		// render invoice html
		view := buildInvoiceViewModel(payload)
		html, err := renderInvoiceTemplate(previewTemplatePath, view)
		if err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{
				"stage": "render_html",
			})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render invoice.",
				"details": err.Error(),
				"path":    previewTemplatePath,
			})
		}

		// render pdf
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

		from := mail.Address{
			Address: app.Settings().Meta.SenderAddress,
			Name:    app.Settings().Meta.SenderName,
		}
		to := []mail.Address{{Address: payload.Customer.Email}}

		msg := &mailer.Message{
			From:    from,
			To:      to,
			Subject: subject,
			HTML: fmt.Sprintf(
				"<p>Hi %s,</p><p>Please find your invoice attached.</p>",
				firstNonEmpty(payload.Customer.FirstName, "there"),
			),
			Text: fmt.Sprintf(
				"Hi %s,\n\nPlease find your invoice attached.\n",
				firstNonEmpty(payload.Customer.FirstName, "there"),
			),
			Attachments: map[string]io.Reader{
				"invoice.pdf": bytes.NewReader(pdfBytes),
			},
		}

		sendStart := time.Now()
		if err := app.NewMailClient().Send(msg); err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{
				"stage":    "send_email",
				"sendMs":   time.Since(sendStart).Milliseconds(),
				"pdfBytes": len(pdfBytes),
			})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to send invoice email.",
				"details": err.Error(),
			})
		}

		updateEmailLog(app, logRec, "sent", "", map[string]any{
			"stage":    "sent",
			"sendMs":   time.Since(sendStart).Milliseconds(),
			"pdfBytes": len(pdfBytes),
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

		// default subject; FE can override later by adding it to payload if you want
		subject := "Your bouquet recommendation"

		// log attempt
		logCtx, meta := buildEmailLogContextFromPayload(payload, "recommendation_bouquet", "manual", "recommendation")
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, payload.Customer.Email, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		from := mail.Address{
			Address: app.Settings().Meta.SenderAddress,
			Name:    app.Settings().Meta.SenderName,
		}
		to := []mail.Address{{Address: payload.Customer.Email}}

		// Keep simple for now; once we hook FE eventType, you can select templates/body copy.
		msg := &mailer.Message{
			From:    from,
			To:      to,
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

		sendStart := time.Now()
		if err := app.NewMailClient().Send(msg); err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{
				"stage":  "send_email",
				"sendMs": time.Since(sendStart).Milliseconds(),
			})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to send recommendation email.",
				"details": err.Error(),
			})
		}

		updateEmailLog(app, logRec, "sent", "", map[string]any{
			"stage":  "sent",
			"sendMs": time.Since(sendStart).Milliseconds(),
		})

		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}).Bind(apis.RequireAuth())
}
