package main

import (
	"encoding/base64"
	"errors"
	"fmt"
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
	orderNo := buildOrderReference(payload)
	orderNo = strings.TrimSpace(orderNo)
	if orderNo == "" {
		orderNo = "Order"
	}
	return fmt.Sprintf("%s %s - Your flower preservation", bookingName, orderNo)
}

func buildOrderReference(payload invoicePayload) string {
	orderRef := formatInvoiceNo(payload.Order.OrderNo.Float64())
	if orderRef == "-" {
		orderRef = strings.TrimSpace(payload.Order.OrderID)
	}
	return strings.TrimSpace(orderRef)
}

func registerEmailRoutes(
	se *core.ServeEvent,
	app *pocketbase.PocketBase,
	previewTemplatePath string,
	resend *ResendClient,
	footerPngBytes []byte,
	invoiceLogoDataURI string,
	emailLogoDataURI string,
	footerDataURI string,
) {
	viewsDir := resolvePathFromExecutable("pb_hooks", "views")
	recommendationService := newRecommendationEmailService(app, resend, emailLogoDataURI)

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

		view := buildInvoiceViewModel(payload, invoiceLogoDataURI, footerDataURI, false)
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
			"logoDataURI": emailLogoDataURI,
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
			"Dear %s %s\n\nReference: Name: %s\nOccasion Date: %s\nInvoice: %s\n\nEstimated Completion Date: %s\nPlease see attached your final invoice which details your display choices, the payments that you have made and the outstanding balance, which is due one month before completion, this will enable us to meet the estimated completion date.\n\nWe kindly request that you read through the details on your invoice and get in touch as soon as possible if you need to amend anything.\n\nKind Regards,\nThe Precious Petals Team\n\nhttps://www.preciouspetals.co.uk\n01256 882422\nStudio Opening hours\nMon - Thurs 9-5\nFri - Sat 9.30-12.30\n",
			emailView.Customer.Title,
			emailView.Customer.Surname,
			emailView.Customer.Surname,
			emailView.Order.OccasionDate,
			emailView.Order.InvoiceNo,
			emailView.Order.RequiredBy,
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

		if strings.TrimSpace(payload.Customer.Email) == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Missing customer email.",
			})
		}

		logCtx, meta := buildEmailLogContextFromPayload(payload, "recommendation_bouquet", "manual", "recommendation")
		if err := recommendationService.send(e.Request.Context(), e, payload, logCtx, meta); err != nil {
			var sendErr *recommendationEmailSendError
			if errors.As(err, &sendErr) && sendErr != nil {
				return e.JSON(http.StatusInternalServerError, map[string]any{
					"ok":      false,
					"error":   sendErr.PublicMessage,
					"details": sendErr.Cause.Error(),
				})
			}
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to send recommendation email.",
				"details": err.Error(),
			})
		}

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
			"logoDataURI": emailLogoDataURI,
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
			"We are pleased to tell you that your order #%s is now ready for collection/delivery.\n\nPlease contact the studio to make the necessary arrangements.\n\nKind regards,\nThe Precious Petals Team\n\nwww.preciouspetals.co.,uk\n01256 882422\nStudio Opening hours\nMon - Thurs 9-5\nFri - Sat 9.30-12.30\n",
			orderNo,
		)

		req := ResendEmailRequest{
			To:      []string{toEmail},
			Subject: subject,
			HTML:    emailHTML,
			Text:    textBody,
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

type recommendationEmailFrame struct {
	DisplayDescription  string
	Size                string
	Layout              string
	FrameType           string
	MainPrice           string
	GlassType           string
	HasAdditionalMount  bool
	AdditionalMount     string
	TotalPrice          string
	HasGlassEngraving   bool
	GlassEngravingLabel string
	GlassEngravingPrice string
}

type recommendationEmailPaperweight struct {
	Quantity   string
	TotalPrice string
}

func buildRecommendationEmailContentFromPayload(payload invoicePayload) ([]recommendationEmailFrame, *recommendationEmailPaperweight) {
	frames := payload.Frames
	if len(frames) == 0 {
		return nil, buildRecommendationPaperweight(payload)
	}

	recommendations := make([]recommendationEmailFrame, 0, len(frames))
	for _, f := range frames {
		mountPrice, engravingPrice, glassPrice, framePrice := extractFrameExtras(f.Extras)
		size := formatRecommendationSizeLabel(
			formatFrameSizeFromPayloadFrame(f.RecommendedSize, f.MeasuredSize, f.Size),
		)
		mount := strings.TrimSpace(f.MountColour)
		if mount == "" || mount == "No Second Mount" {
			mount = "-"
		}
		layout := formatRecommendationLabel(f.Layout)
		frameType := formatRecommendationLabel(f.FrameType)
		glassType := formatRecommendationLabel(f.GlassType)
		if glassType == "" {
			glassType = "conservation glass"
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

		recommendation := recommendationEmailFrame{
			DisplayDescription: strings.TrimSpace(strings.Join([]string{size, layout}, " ")),
			Size:               size,
			Layout:             layout,
			FrameType:          frameType,
			MainPrice:          formatGBP(basePrice),
			GlassType:          glassType,
		}

		if mount != "-" && mountPrice.Float64() != nil && *mountPrice.Float64() > 0 {
			recommendation.HasAdditionalMount = true
			recommendation.AdditionalMount = formatRecommendationLabel(mount)
			recommendation.TotalPrice = formatGBP(basePrice + floatFromNumber(mountPrice))
		}

		if engravingPrice.Float64() != nil && *engravingPrice.Float64() > 0 {
			engravingText := strings.TrimSpace(f.GlassEngraving)
			engravingLabel := "Glass engraving"
			if engravingText != "" {
				engravingLabel = fmt.Sprintf("Glass engraving - \"%s\"", engravingText)
			}
			recommendation.HasGlassEngraving = true
			recommendation.GlassEngravingLabel = engravingLabel
			recommendation.GlassEngravingPrice = formatGBP(floatFromNumber(engravingPrice))
		}

		recommendations = append(recommendations, recommendation)
	}

	return recommendations, buildRecommendationPaperweight(payload)
}

func buildRecommendationPaperweight(payload invoicePayload) *recommendationEmailPaperweight {
	pw := payload.GetPaperweight()
	if pw == nil || pw.Price.Float64() == nil {
		return nil
	}

	qty := 1.0
	if pw.Quantity.Float64() != nil && *pw.Quantity.Float64() > 0 {
		qty = *pw.Quantity.Float64()
	}

	return &recommendationEmailPaperweight{
		Quantity:   fmt.Sprintf("%.0f", qty),
		TotalPrice: formatGBP(*pw.Price.Float64()),
	}
}

func formatRecommendationLabel(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	normalized := strings.ReplaceAll(trimmed, "Hand tied", "hand-tied")
	normalized = strings.ReplaceAll(normalized, "Hand Tied", "hand-tied")
	normalized = strings.ReplaceAll(normalized, "Birds eye", "birds eye")

	return strings.ToLower(normalized[:1]) + normalized[1:]
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

func formatRecommendationSizeLabel(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}

	normalized := strings.ReplaceAll(trimmed, `"`, "")
	normalized = strings.ReplaceAll(normalized, "X", " x ")
	normalized = strings.ReplaceAll(normalized, "x", " x ")
	normalized = strings.Join(strings.Fields(normalized), " ")

	lower := strings.ToLower(normalized)
	switch {
	case strings.HasSuffix(lower, " inches"):
		return strings.TrimSpace(normalized[:len(normalized)-len("inches")]) + " inch"
	case strings.HasSuffix(lower, " inch"):
		return normalized
	case strings.HasSuffix(lower, " in"):
		return strings.TrimSpace(normalized[:len(normalized)-len("in")]) + " inch"
	default:
		return normalized + " inch"
	}
}

func buildRecommendationTextBody(
	payload invoicePayload,
	occasionDate string,
	ref string,
	recommendationFrames []recommendationEmailFrame,
) string {
	paragraphs := []string{
		fmt.Sprintf(
			"Dear %s %s,",
			strings.TrimSpace(payload.Customer.Title),
			strings.TrimSpace(payload.Customer.Surname),
		),
		fmt.Sprintf(
			"Reference: %s\nOccasion Date: %s\nReference Number: %s",
			strings.TrimSpace(payload.Customer.Surname),
			occasionDate,
			ref,
		),
		"We are delighted to have been asked to preserve your flowers. They have now been photographed, measured, and the preservation process has begun.",
		"As each piece we create is bespoke, we kindly ask all customers to complete the order form below to confirm how they would like their flowers displayed - even for smaller items such as paperweights. This helps us fully understand your preferences and ensures we create something just right for you. It should only take a few minutes, and we respectfully ask that you return it within four weeks to avoid delays.",
		"You can access the form here:\nhttps://eu.jotform.com/PPetals/order-form",
		"If you would prefer to visit our studio to complete the form and discuss your options with one of our artists, or if you would like a phone consultation, please call us as soon as possible to arrange an appointment. Your flowers will be ready for you to view in approximately one month.",
	}

	for index, frame := range recommendationFrames {
		displayDescription := strings.TrimSpace(frame.DisplayDescription)
		if displayDescription == "" {
			displayDescription = "display"
		} else {
			displayDescription += " display"
		}

		recommendationLead := fmt.Sprintf(
			"We would like to suggest a %s in a %s frame.",
			displayDescription,
			frame.FrameType,
		)
		if index > 0 {
			recommendationLead = fmt.Sprintf(
				"We would also like to suggest a %s in a %s frame for your extra display.",
				displayDescription,
				frame.FrameType,
			)
		}

		paragraphs = append(paragraphs,
			fmt.Sprintf(
				"%s This style would complement your flowers beautifully. The price is %s, including the frame with %s and a single mount.",
				recommendationLead,
				frame.MainPrice,
				frame.GlassType,
			),
		)

		if frame.HasAdditionalMount {
			paragraphs = append(paragraphs,
				fmt.Sprintf(
					"An additional %s mount would further enhance the display, bringing the total to %s.",
					frame.AdditionalMount,
					frame.TotalPrice,
				),
			)
		}

		if frame.HasGlassEngraving {
			paragraphs = append(paragraphs,
				fmt.Sprintf(
					"%s would be an additional %s.",
					frame.GlassEngravingLabel,
					frame.GlassEngravingPrice,
				),
			)
		}
	}

	paragraphs = append(paragraphs,
		"There are many more ideas available on our website, including a range of beautiful optional extras you may wish to include in your order.",
		"If you had a hand-tied bouquet, you may prefer a side profile display (showing the stems and ribbons). This can be created in a larger frame for an additional £50.00.",
		"The price includes the replacement of any damaged flowers, which we recommend considering. To do this accurately, we will need a list of the flower varieties used by your florist, as some seasonal flowers may need to be ordered promptly.",
		"You can also find the order form within the frame styles section of our website:\nhttps://www.preciouspetals.co.uk/framestyles",
		"Please remember to include any special requirements in the additional instructions section of the form.",
		"Your order is accepted on the basis that you have read and agree to our terms and conditions:\nhttps://www.preciouspetals.co.uk/terms",
		"Please note that flowers may change colour slightly during the preservation process due to the removal of moisture.",
		"If you have any questions or would like assistance completing the form, please do not hesitate to get in touch - we are always happy to help.",
		"Once we receive your completed form and final payment, your preserved arrangement will be ready within four weeks.",
		"Kind regards,\nThe Precious Petals Team",
		"https://www.preciouspetals.co.uk\n01256 882422\nStudio Opening hours\nMon - Thurs 9-5\nFri - Sat 9.30-12.30",
	)

	return strings.Join(paragraphs, "\n\n")
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
