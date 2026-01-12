package main

import (
	"errors"
	"net/http"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	app := pocketbase.New()

	jsvm.MustRegister(app, jsvm.Config{
		HooksDir:      "pb_hooks",
		MigrationsDir: "pb_migrations",
	})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		previewTemplatePath := resolvePathFromExecutable("pb_hooks", "views", "invoice.preview.html")

		registerInvoiceRoutes(se, app, previewTemplatePath)
		registerEmailRoutes(se, app, previewTemplatePath)
		registerExportRoutes(se, app)

		// serving SPA app
		publicDir := resolvePathFromExecutable("pb_public")
		se.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))

		return se.Next()
	})

	if err := app.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
