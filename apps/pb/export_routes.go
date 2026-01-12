package main

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func registerExportRoutes(se *core.ServeEvent, app *pocketbase.PocketBase) {
	se.Router.GET("/api/export/orders.xlsx", func(e *core.RequestEvent) error {
		return handleOrdersExport(app, e)
	}).Bind(apis.RequireAuth())
}
