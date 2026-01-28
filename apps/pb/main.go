package main

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

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
		env := strings.ToLower(strings.TrimSpace(os.Getenv("PB_ENV")))
		if env == "" {
			// Best-effort local env loading so PB_ENV/RESEND_* can be picked up in dev.
			_ = godotenv.Load(resolvePathFromExecutable(".env"))
			env = strings.ToLower(strings.TrimSpace(os.Getenv("PB_ENV")))
		}
		isDev := env == "dev"

		invoicePreviewTemplatePath := resolvePathFromExecutable("pb_hooks", "views", "invoice.preview.html")

		footerPngPath := resolvePathFromExecutable("pb_public", "email", "pp-footer.png")
		footerPngBytes, err := os.ReadFile(footerPngPath)
		if err != nil {
			fmt.Println("WARN: failed to read footer image:", err.Error())
			footerPngBytes = nil
		}

		logoDataURI := ""
		logoPath := resolvePBPublicPath("email", "pp-logo.png")
		if logoBytes, logoErr := os.ReadFile(logoPath); logoErr != nil {
			fmt.Println("WARN: failed to read invoice logo:", logoErr.Error())
		} else {
			logoDataURI = "data:image/png;base64," + base64.StdEncoding.EncodeToString(logoBytes)
		}

		footerDataURI := ""
		footerPath := resolvePBPublicPath("email", "pp-invoice-footer.png")
		if footerBytes, footerErr := os.ReadFile(footerPath); footerErr != nil {
			fmt.Println("WARN: failed to read invoice footer:", footerErr.Error())
		} else {
			footerDataURI = "data:image/png;base64," + base64.StdEncoding.EncodeToString(footerBytes)
		}

		// Always register the rest.
		registerInvoiceRoutes(se, app, invoicePreviewTemplatePath, logoDataURI, footerDataURI)
		registerExportRoutes(se, app)
		registerSmsRoutes(se, app)

		// Email:
		// - In prod/default: fail fast if Resend isn't configured correctly.
		// - In dev: only enable if RESEND_API_KEY is present (so dev can boot without it).
		if !isDev {
			resendClient, err := NewResendClient(app)
			if err != nil {
				return fmt.Errorf("email disabled: resend misconfigured: %w", err)
			}
			registerEmailRoutes(se, app, invoicePreviewTemplatePath, resendClient, footerPngBytes, logoDataURI, footerDataURI)

		} else {
			// Dev: optional
			if strings.TrimSpace(os.Getenv("RESEND_API_KEY")) != "" {
				resendClient, err := NewResendClient(app)
				if err != nil {
					return fmt.Errorf("resend misconfigured in dev: %w", err)
				}
				registerEmailRoutes(se, app, invoicePreviewTemplatePath, resendClient, footerPngBytes, logoDataURI, footerDataURI)
			}
		}

		publicDir := resolvePathFromExecutable("pb_public")
		se.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))

		return se.Next()
	})

	if err := app.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
