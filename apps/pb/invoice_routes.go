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
}
