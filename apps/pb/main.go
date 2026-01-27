package main

import (
	"errors"
	"net/http"
	"os"

	_ "precious-petals/pb-crm/pb_migrations"

	"github.com/joho/godotenv"
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
		// Local env loading to support apps/pb/.env in dev.
		_ = godotenv.Load(resolvePathFromExecutable(".env"))

		invoicePreviewTemplatePath := resolvePathFromExecutable("pb_hooks", "views", "invoice.preview.html")

		resendClient, err := NewResendClient(app)
		if err != nil {
			// Fail fast so you don't silently ship with broken email.
			return err
		}

		registerInvoiceRoutes(se, app, invoicePreviewTemplatePath)
		registerEmailRoutes(se, app, invoicePreviewTemplatePath, resendClient)
		registerExportRoutes(se, app)
		registerSmsRoutes(se, app)

		publicDir := resolvePathFromExecutable("pb_public")
		se.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))

		return se.Next()
	})

	if err := app.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
