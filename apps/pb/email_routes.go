package main

import (
	"encoding/base64"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func addCidFooter(req *ResendEmailRequest, footerPngBytes []byte) {
	if len(footerPngBytes) == 0 {
		return
	}

	req.Attachments = append([]ResendAttachment{
		{
			Filename:           "pp-footer.png",
			Content:            base64.StdEncoding.EncodeToString(footerPngBytes),
			ContentType:        "image/png",
			ContentID:          "pp_footer",
			ContentDisposition: "inline",
		},
	}, req.Attachments...)
}

func buildOrderSubject(payload invoicePayload) string {
	nameParts := []string{
		strings.TrimSpace(payload.Customer.Title),
		strings.TrimSpace(payload.Customer.FirstName),
		strings.TrimSpace(payload.Customer.Surname),
	}
	filtered := make([]string, 0, len(nameParts))
	for _, part := range nameParts {
		if part != "" {
			filtered = append(filtered, part)
		}
	}
	bookingName := strings.TrimSpace(strings.Join(filtered, " "))
	if bookingName == "" {
		bookingName = strings.TrimSpace(payload.Customer.Surname)
	}
	orderNo := formatInvoiceNo(payload.Order.OrderNo.Float64())
	if orderNo == "-" {
		orderNo = strings.TrimSpace(payload.Order.OrderID)
	}
	orderNo = strings.TrimSpace(orderNo)
	if orderNo == "" {
		orderNo = "Order"
	}
	return fmt.Sprintf("%s %s - Your flower preservation", bookingName, orderNo)
}

func registerEmailRoutes(
	se *core.ServeEvent,
	app *pocketbase.PocketBase,
	previewTemplatePath string,
	resend *ResendClient,
	footerPngBytes []byte,
	logoDataURI string,
	footerDataURI string,
) {
	viewsDir := resolvePathFromExecutable("pb_hooks", "views")

	se.Router.POST("/api/email/invoice", func(e *core.RequestEvent) error {
		var payload invoicePayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		originalTo := strings.TrimSpace(payload.Customer.Email)
		if originalTo == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Missing customer email.",
			})
		}

		toEmail := originalTo
		if devOverride := strings.TrimSpace(os.Getenv("RESEND_DEV_OVERRIDE_TO")); devOverride != "" {
			toEmail = devOverride
		}

		subject := buildOrderSubject(payload)

		logCtx, meta := buildEmailLogContextFromPayload(payload, "invoice", "manual", "invoice")
		if toEmail != originalTo {
			meta["recipientOverride"] = true
			meta["overrideRecipient"] = toEmail
			meta["originalRecipient"] = originalTo
		}
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, originalTo, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		view := buildInvoiceViewModel(payload, logoDataURI, footerDataURI, false)
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

		emailView := struct {
			Customer struct {
				Title   string
				Surname string
			}
			Order struct {
				OccasionDate string
				RequiredBy   string
				InvoiceNo    string
			}
		}{}
		emailView.Customer.Title = strings.TrimSpace(payload.Customer.Title)
		emailView.Customer.Surname = strings.TrimSpace(payload.Customer.Surname)
		emailView.Order.OccasionDate = formatDate(string(payload.Order.OccasionDate))
		emailView.Order.RequiredBy = formatDate(string(payload.Order.RequiredBy))
		emailView.Order.InvoiceNo = formatInvoiceNo(payload.Order.OrderNo.Float64())

		emailHTML, err := renderEmailTemplate(viewsDir, "email.invoice.html", map[string]any{
			"customer": map[string]any{
				"title":   emailView.Customer.Title,
				"surname": emailView.Customer.Surname,
			},
			"order": map[string]any{
				"occasionDate":  emailView.Order.OccasionDate,
				"requiredBy":    emailView.Order.RequiredBy,
				"invoiceNumber": emailView.Order.InvoiceNo,
			},
		})
		if err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{"stage": "render_email_html"})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render invoice email.",
				"details": err.Error(),
			})
		}

		textBody := fmt.Sprintf(
			"Dear %s %s\n\nReference: Name: %s, Occasion Date: %s, Estimated Completion Date: %s, Invoice: %s\n\nPlease see attached your final invoice which details your display choices, the payments that you have made and the outstanding balance, which is due one month before completion, this will enable us to meet the estimated completion date.\n\nWe kindly request that you read through the details on your invoice and get in touch as soon as possible if you need to amend anything.\n\nKind Regards\nThe Precious Petals Team\n",
			emailView.Customer.Title,
			emailView.Customer.Surname,
			emailView.Customer.Surname,
			emailView.Order.OccasionDate,
			emailView.Order.RequiredBy,
			emailView.Order.InvoiceNo,
		)

		req := ResendEmailRequest{
			To:      []string{toEmail},
			Subject: subject,
			HTML:    emailHTML,
			Text:    textBody,
			Attachments: []ResendAttachment{
				{
					Filename:           "invoice.pdf",
					Content:            base64.StdEncoding.EncodeToString(pdfBytes),
					ContentType:        "application/pdf",
					ContentDisposition: "attachment",
				},
			},
		}

		// MISSING BEFORE: actually add the CID inline footer attachment
		addCidFooter(&req, footerPngBytes)

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
			"toEmailActual":  toEmail,
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

		originalTo := strings.TrimSpace(payload.Customer.Email)
		if originalTo == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Missing customer email.",
			})
		}

		toEmail := originalTo
		if devOverride := strings.TrimSpace(os.Getenv("RESEND_DEV_OVERRIDE_TO")); devOverride != "" {
			toEmail = devOverride
		}

		subject := buildOrderSubject(payload)

		logCtx, meta := buildEmailLogContextFromPayload(payload, "recommendation_bouquet", "manual", "recommendation")
		if toEmail != originalTo {
			meta["recipientOverride"] = true
			meta["overrideRecipient"] = toEmail
			meta["originalRecipient"] = originalTo
		}
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, originalTo, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		occasionDate := formatDate(string(payload.Order.OccasionDate))

		ref := strings.TrimSpace(payload.Order.OrderID)
		if ref == "" {
			ref = formatInvoiceNo(payload.Order.OrderNo.Float64())
		}

		recoTableHTML, frameCount := buildRecommendationNarrativeHTMLFromPayload(payload)

		emailHTML, err := renderEmailTemplate(viewsDir, "email.recommendation.html", map[string]any{
			"customer": map[string]any{
				"title":   strings.TrimSpace(payload.Customer.Title),
				"surname": strings.TrimSpace(payload.Customer.Surname),
			},
			"order": map[string]any{
				"occasionDate": occasionDate,
				"ref":          ref,
			},
			"links": map[string]any{
				"jotform":     "https://eu.jotform.com/PPetals/order-form",
				"frameStyles": "https://www.preciouspetals.co.uk/framestyles",
				"terms":       "https://www.preciouspetals.co.uk/terms",
			},
			"suggestions": map[string]any{
				"sideProfileUpsizePrice": "£50.00",
			},
			"recommendation": map[string]any{
				"frames":      make([]any, frameCount),
				"tableHtml":   template.HTML(recoTableHTML),
				"framesTotal": "",
				"portalTotal": "",
			},
			"brand": map[string]any{
				"name":    "Precious Petals",
				"tagline": "Flower Preservation Specialists",
				"phone":   "0191 000 0000",
				"website": "https://www.preciouspetals.co.uk",
			},
		})
		if err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{"stage": "render_email_html"})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render recommendation email.",
				"details": err.Error(),
			})
		}

		textBody := fmt.Sprintf(
			"Dear %s %s\n\nReference: Name: %s  Occasion Date: %s  %s\n\nWe are delighted to have been asked to preserve your flowers. They have been photographed, measured and the preservation process has begun.\n\nThe next step is for you to complete our order form:\n%s\n\nKind Regards\nThe Precious Petals Team\n",
			strings.TrimSpace(payload.Customer.Title),
			strings.TrimSpace(payload.Customer.Surname),
			strings.TrimSpace(payload.Customer.Surname),
			occasionDate,
			ref,
			"https://eu.jotform.com/PPetals/order-form",
		)

		req := ResendEmailRequest{
			To:      []string{toEmail},
			Subject: subject,
			HTML:    emailHTML,
			Text:    textBody,
		}

		// MISSING BEFORE: actually add the CID inline footer attachment
		addCidFooter(&req, footerPngBytes)

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
			"toEmailActual":  toEmail,
		})

		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}).Bind(apis.RequireAuth())

	se.Router.POST("/api/email/delivery-collect", func(e *core.RequestEvent) error {
		var payload invoicePayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		originalTo := strings.TrimSpace(payload.Customer.Email)
		if originalTo == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Missing customer email.",
			})
		}

		toEmail := originalTo
		if devOverride := strings.TrimSpace(os.Getenv("RESEND_DEV_OVERRIDE_TO")); devOverride != "" {
			toEmail = devOverride
		}

		orderNo := formatInvoiceNo(payload.Order.OrderNo.Float64())
		subject := buildOrderSubject(payload)

		logCtx, meta := buildEmailLogContextFromPayload(payload, "delivery_collect", "delivery_collect", "delivery_collect")
		if toEmail != originalTo {
			meta["recipientOverride"] = true
			meta["overrideRecipient"] = toEmail
			meta["originalRecipient"] = originalTo
		}
		toName := buildCustomerDisplayName(payload)

		var logRec *core.Record
		if rec, err := createEmailLog(app, e, originalTo, toName, subject, logCtx, meta); err == nil {
			logRec = rec
		} else {
			fmt.Println("email log create failed:", err.Error())
		}

		emailHTML, err := renderEmailTemplate(viewsDir, "email.delivery_collect.html", map[string]any{
			"order": map[string]any{
				"orderNo": orderNo,
			},
		})
		if err != nil {
			updateEmailLog(app, logRec, "failed", err.Error(), map[string]any{"stage": "render_email_html"})
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render delivery/collection email.",
				"details": err.Error(),
			})
		}

		textBody := fmt.Sprintf(
			"We are pleased to tell you that your order #%s is now ready for collection/delivery.\n\nPlease contact the studio to make the necessary arrangements.\n\nKind Regards,\nThe Precious Petals Team\n",
			orderNo,
		)

		req := ResendEmailRequest{
			To:      []string{toEmail},
			Subject: subject,
			HTML:    emailHTML,
			Text:    textBody,
		}

		addCidFooter(&req, footerPngBytes)

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
				"error":   "Failed to send delivery/collection email.",
				"details": sendErr.Error(),
			})
		}

		updateEmailLog(app, logRec, "sent", "", map[string]any{
			"stage":          "sent",
			"sendMs":         time.Since(sendStart).Milliseconds(),
			"resendId":       resp.ID,
			"idempotencyKey": idemKey,
			"toEmailActual":  toEmail,
		})

		return e.JSON(http.StatusOK, map[string]any{"ok": true})
	}).Bind(apis.RequireAuth())
}

func formatGBP(v float64) string {
	if v == 0 {
		return ""
	}
	return fmt.Sprintf("£%.2f", v)
}

func htmlEscape(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	s = strings.ReplaceAll(s, "'", "&#39;")
	return s
}

func buildRecommendationNarrativeHTMLFromPayload(payload invoicePayload) (string, int) {
	frames := payload.Frames
	if len(frames) == 0 {
		return "<p><em>No frame recommendations found.</em></p>", 0
	}

	paragraphs := make([]string, 0, len(frames))
	for i, f := range frames {
		mountPrice, engravingPrice, glassPrice, framePrice := extractFrameExtras(f.Extras)
		size := formatFrameSizeFromPayloadFrame(f.RecommendedSize, f.MeasuredSize, f.Size)
		mount := strings.TrimSpace(f.MountColour)
		if mount == "" || mount == "No Second Mount" {
			mount = "-"
		}
		layout := strings.TrimSpace(f.Layout)
		frameType := strings.TrimSpace(f.FrameType)
		glassType := strings.TrimSpace(f.GlassType)
		preservation := strings.TrimSpace(f.PreservationType)
		if preservation == "" {
			preservation = strings.TrimSpace(f.Inclusions)
		}

		basePrice := floatFromNumber(f.Price)
		if framePrice.Float64() != nil {
			basePrice = floatFromNumber(framePrice)
		} else if glassPrice.Float64() != nil && *glassPrice.Float64() > 0 {
			basePrice = basePrice - floatFromNumber(glassPrice)
		}
		if basePrice < 0 {
			basePrice = 0
		}

		mainParts := []string{}
		if size != "" {
			mainParts = append(mainParts, size)
		}
		if layout != "" {
			mainParts = append(mainParts, layout)
		}
		if frameType != "" {
			mainParts = append(mainParts, frameType)
		}
		frameDescriptor := strings.Join(mainParts, " ")
		if frameDescriptor == "" {
			frameDescriptor = fmt.Sprintf("frame %d", i+1)
		}

		glassSegment := "conservation glass"
		if glassType != "" {
			glassSegment = glassType
		}
		singleMount := "a single mount"
		if mount == "-" {
			singleMount = "a single mount"
		}
		preservationSegment := ""
		if preservation != "" {
			preservationSegment = fmt.Sprintf(" with %s preservation", preservation)
		}

		mainSentence := fmt.Sprintf(
			"We would like to suggest that a %s display%s would look lovely with your bridal flowers. The price of this is %s to include the frame with %s and %s.",
			htmlEscape(frameDescriptor),
			htmlEscape(preservationSegment),
			formatGBP(basePrice),
			htmlEscape(glassSegment),
			singleMount,
		)

		additionalSentence := ""
		if mount != "-" && mountPrice.Float64() != nil && *mountPrice.Float64() > 0 {
			additionalSentence = fmt.Sprintf(
				" An additional %s mount would also complement the flowers which would be %s.",
				htmlEscape(mount),
				formatGBP(floatFromNumber(mountPrice)),
			)
		}

		engravingSentence := ""
		if engravingPrice.Float64() != nil && *engravingPrice.Float64() > 0 {
			engravingText := strings.TrimSpace(f.GlassEngraving)
			engravingLabel := "Glass engraving"
			if engravingText != "" {
				engravingLabel = fmt.Sprintf("Glass engraving - \"%s\"", engravingText)
			}
			engravingSentence = fmt.Sprintf(
				" %s would be %s.",
				htmlEscape(engravingLabel),
				formatGBP(floatFromNumber(engravingPrice)),
			)
		}

		paragraphs = append(paragraphs, fmt.Sprintf("<p>%s%s%s</p>", mainSentence, additionalSentence, engravingSentence))
	}

	if pw := payload.GetPaperweight(); pw != nil && pw.Price.Float64() != nil {
		qty := 1.0
		if pw.Quantity.Float64() != nil && *pw.Quantity.Float64() > 0 {
			qty = *pw.Quantity.Float64()
		}
		total := *pw.Price.Float64()
		pwSentence := fmt.Sprintf("We also recommend a Paperweight (Quantity: %.0f) for %s.", qty, formatGBP(total))
		paragraphs = append(paragraphs, fmt.Sprintf("<p>%s</p>", pwSentence))
	}

	return strings.Join(paragraphs, "\n"), len(frames)
}

func formatFrameSizeFromPayloadFrame(recommendedSize, measuredSize, size string) string {
	if strings.TrimSpace(recommendedSize) != "" {
		return strings.TrimSpace(recommendedSize)
	}
	if strings.TrimSpace(measuredSize) != "" {
		return strings.TrimSpace(measuredSize)
	}
	return strings.TrimSpace(size)
}

func floatFromNumber(n Number) float64 {
	if n.Float64() == nil {
		return 0
	}
	return *n.Float64()
}

func extractFrameExtras(extras *struct {
	FramePrice          Number `json:"framePrice"`
	MountPrice          Number `json:"mountPrice"`
	GlassPrice          Number `json:"glassPrice"`
	GlassEngravingPrice Number `json:"glassEngravingPrice"`
}) (Number, Number, Number, Number) {
	var mountPrice, engravingPrice, glassPrice, framePrice Number
	if extras == nil {
		return mountPrice, engravingPrice, glassPrice, framePrice
	}
	return extras.MountPrice, extras.GlassEngravingPrice, extras.GlassPrice, extras.FramePrice
}
