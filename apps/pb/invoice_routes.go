package main

import (
	"fmt"
	"net/http"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func registerInvoiceRoutes(se *core.ServeEvent, app *pocketbase.PocketBase, previewTemplatePath string) {
	se.Router.POST("/api/invoice/preview", func(e *core.RequestEvent) error {
		var payload invoicePayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		view := buildInvoiceViewModel(payload)

		html, err := renderInvoiceTemplate(previewTemplatePath, view)
		if err != nil {
			fmt.Println("invoice templatePath:", previewTemplatePath)
			fmt.Println("invoice render error:", err.Error())

			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render invoice.",
				"details": err.Error(),
			})
		}

		return e.HTML(http.StatusOK, html)
	}).Bind(apis.RequireAuth())

	se.Router.POST("/api/invoice/pdf", func(e *core.RequestEvent) error {
		var payload invoicePayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		view := buildInvoiceViewModel(payload)
		html, err := renderInvoiceTemplate(previewTemplatePath, view)
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to render invoice.",
				"details": err.Error(),
			})
		}

		pdfBytes, err := renderInvoicePdf(html)
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":      false,
				"error":   "Failed to generate invoice PDF.",
				"details": err.Error(),
			})
		}

		filename := fmt.Sprintf("invoice-%s.pdf", view.InvoiceNo)
		e.Response.Header().Set("Content-Type", "application/pdf")
		e.Response.Header().Set(
			"Content-Disposition",
			fmt.Sprintf("attachment; filename=%q", filename),
		)
		e.Response.WriteHeader(http.StatusOK)
		_, _ = e.Response.Write(pdfBytes)
		return nil
	}).Bind(apis.RequireAuth())
}
