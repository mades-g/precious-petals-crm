package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"net/mail"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/mailer"
)

//
// -------- Flexible JSON types (to avoid bind failures) --------
//

// Number can decode from JSON number OR JSON string (or null).
type Number struct {
	Val *float64
}

func (n *Number) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))
	if s == "" || s == "null" {
		n.Val = nil
		return nil
	}

	// string-encoded number?
	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		unq, err := strconv.Unquote(s)
		if err != nil {
			return err
		}
		unq = strings.TrimSpace(unq)
		if unq == "" {
			n.Val = nil
			return nil
		}
		f, err := strconv.ParseFloat(unq, 64)
		if err != nil {
			return err
		}
		n.Val = &f
		return nil
	}

	// numeric
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return err
	}
	n.Val = &f
	return nil
}

func (n Number) Float64() *float64 { return n.Val }

// StringDate accepts "YYYY-MM-DD" OR "DD/MM/YYYY" and keeps original string.
type StringDate string

func (d *StringDate) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))
	if s == "" || s == "null" {
		*d = ""
		return nil
	}

	if len(s) >= 2 && s[0] == '"' && s[len(s)-1] == '"' {
		unq, err := strconv.Unquote(s)
		if err != nil {
			return err
		}
		*d = StringDate(unq)
		return nil
	}

	// fallback (shouldn't happen for json strings)
	*d = StringDate(s)
	return nil
}

//
// -------- Payload models --------
//

type invoicePayload struct {
	Customer struct {
		Title       string `json:"title"`
		FirstName   string `json:"firstName"`
		Surname     string `json:"surname"`
		DisplayName string `json:"displayName"`
		Email       string `json:"email"`

		// ignored extras from FE (won't break)
		ID          string `json:"id"`
		PhoneNumber string `json:"phoneNumber"`
	} `json:"customer"`

	Order struct {
		OrderNo      Number     `json:"orderNo"`
		OccasionDate StringDate `json:"occasionDate"`

		BillingAddressLine1 string `json:"billingAddressLine1"`
		BillingAddressLine2 string `json:"billingAddressLine2"`
		BillingTown         string `json:"billingTown"`
		BillingCounty       string `json:"billingCounty"`
		BillingPostcode     string `json:"billingPostcode"`

		// ignored extras from FE
		OrderID string `json:"orderId"`
		Created string `json:"created"`
	} `json:"order"`

	OrderExtras *struct {
		ReplacementFlowers       bool   `json:"replacementFlowers"`
		ReplacementFlowersQty    Number `json:"replacementFlowersQty"`
		ReplacementFlowersPrice  Number `json:"replacementFlowersPrice"`
		CollectionQty            Number `json:"collectionQty"`
		CollectionPrice          Number `json:"collectionPrice"`
		DeliveryQty              Number `json:"deliveryQty"`
		DeliveryPrice            Number `json:"deliveryPrice"`
		ReturnUnusedFlowers      bool   `json:"returnUnusedFlowers"`
		ReturnUnusedFlowersPrice Number `json:"returnUnusedFlowersPrice"`
		ArtistHours              Number `json:"artistHours"`
		Notes                    string `json:"notes"`
	} `json:"orderExtras"`

	Frames []struct {
		Size           string `json:"size"`
		FrameType      string `json:"frameType"`
		GlassType      string `json:"glassType"`
		Inclusions     string `json:"inclusions"`
		MountColour    string `json:"mountColour"`
		GlassEngraving string `json:"glassEngraving"`

		Price  Number `json:"price"`
		Extras *struct {
			MountPrice          Number `json:"mountPrice"`
			GlassPrice          Number `json:"glassPrice"`
			GlassEngravingPrice Number `json:"glassEngravingPrice"`
		} `json:"extras"`
	} `json:"frames"`

	// Support BOTH keys:
	Paperweight      *paperweightPayload `json:"paperweight"`
	PaperWeightOrder *paperweightPayload `json:"paperWeightOrder"`

	Totals struct {
		SubTotal   float64 `json:"subTotal"`
		VatRate    float64 `json:"vatRate"`
		VatTotal   float64 `json:"vatTotal"`
		GrandTotal float64 `json:"grandTotal"`
	} `json:"totals"`
}

type paperweightPayload struct {
	Quantity Number `json:"quantity"`
	Price    Number `json:"price"`
}

func (p invoicePayload) GetPaperweight() *paperweightPayload {
	if p.Paperweight != nil {
		return p.Paperweight
	}
	if p.PaperWeightOrder != nil {
		return p.PaperWeightOrder
	}
	return nil
}

type invoiceRow struct {
	ItemLabel   string
	Description string
	Amount      string
	IsSubItem   bool
}

type invoiceViewModel struct {
	Address      string
	OccasionDate string
	InvoiceDate  string
	InvoiceNo    string
	Rows         []invoiceRow
	Notes        string
	SubTotal     string
	VatTotal     string
	GrandTotal   string
	Credits      string
	BalanceDue   string
}

func formatMoney(value float64) string {
	return fmt.Sprintf("£%.2f", value)
}

func formatDate(value string) string {
	if strings.TrimSpace(value) == "" {
		return "-"
	}
	if strings.Contains(value, "/") {
		return value
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return value
	}
	return parsed.Format("02/01/2006")
}

func formatInvoiceNo(value *float64) string {
	if value == nil {
		return "-"
	}
	return strconv.FormatInt(int64(*value), 10)
}

func buildInvoiceRows(payload invoicePayload) []invoiceRow {
	rows := []invoiceRow{}
	itemIndex := 1

	for _, frame := range payload.Frames {
		basePrice := 0.0
		if frame.Price.Float64() != nil {
			basePrice = *frame.Price.Float64()
		}

		descriptionParts := []string{"Picture"}
		if frame.Size != "" {
			descriptionParts = append(descriptionParts, frame.Size)
		}
		if frame.FrameType != "" {
			descriptionParts = append(descriptionParts, fmt.Sprintf("%s frame", frame.FrameType))
		}
		if frame.GlassType != "" {
			descriptionParts = append(descriptionParts, frame.GlassType)
		}

		rows = append(rows, invoiceRow{
			ItemLabel:   fmt.Sprintf("Item %d", itemIndex),
			Description: strings.Join(descriptionParts, ", "),
			Amount:      formatMoney(basePrice),
		})

		if frame.Extras != nil {
			mountColour := strings.TrimSpace(frame.MountColour)

			if frame.Extras.MountPrice.Float64() != nil && *frame.Extras.MountPrice.Float64() > 0 {
				mountSuffix := ""
				if frame.Inclusions == "Buttonhole" {
					mountSuffix = " - Buttonhole"
				}
				mountLabel := "Mount"
				if mountColour != "" {
					mountLabel = fmt.Sprintf("Mount - %s", mountColour)
				}
				rows = append(rows, invoiceRow{
					ItemLabel:   "",
					Description: mountLabel + mountSuffix,
					Amount:      formatMoney(*frame.Extras.MountPrice.Float64()),
					IsSubItem:   true,
				})
			}

			if frame.Extras.GlassPrice.Float64() != nil && *frame.Extras.GlassPrice.Float64() > 0 {
				rows = append(rows, invoiceRow{
					ItemLabel:   "",
					Description: fmt.Sprintf("Glass - %s", frame.GlassType),
					Amount:      formatMoney(*frame.Extras.GlassPrice.Float64()),
					IsSubItem:   true,
				})
			}

			if frame.Extras.GlassEngravingPrice.Float64() != nil && *frame.Extras.GlassEngravingPrice.Float64() > 0 {
				engravingText := strings.TrimSpace(frame.GlassEngraving)
				desc := "Glass engraving"
				if engravingText != "" {
					desc = fmt.Sprintf("Glass engraving - \"%s\"", engravingText)
				}
				rows = append(rows, invoiceRow{
					ItemLabel:   "",
					Description: desc,
					Amount:      formatMoney(*frame.Extras.GlassEngravingPrice.Float64()),
					IsSubItem:   true,
				})
			}
		}

		itemIndex += 1
	}

	// Paperweight (accept either "paperweight" or "paperWeightOrder")
	if pw := payload.GetPaperweight(); pw != nil && pw.Price.Float64() != nil {
		qty := 1.0
		if pw.Quantity.Float64() != nil && *pw.Quantity.Float64() > 0 {
			qty = *pw.Quantity.Float64()
		}
		total := *pw.Price.Float64()

		rows = append(rows, invoiceRow{
			ItemLabel:   fmt.Sprintf("Item %d", itemIndex),
			Description: fmt.Sprintf("Paperweight - Quantity %.0f", qty),
			Amount:      formatMoney(total),
		})
		itemIndex += 1
	}

	// Other extras
	extras := payload.OrderExtras
	if extras != nil {
		pushOtherRow := func(description string, amount *float64) {
			if amount != nil && *amount > 0 {
				rows = append(rows, invoiceRow{
					ItemLabel:   "Other",
					Description: description,
					Amount:      formatMoney(*amount),
				})
			}
		}

		if extras.ReplacementFlowers || extras.ReplacementFlowersQty.Float64() != nil || extras.ReplacementFlowersPrice.Float64() != nil {
			qtyPart := ""
			if extras.ReplacementFlowersQty.Float64() != nil {
				qtyPart = fmt.Sprintf(" - Qty %.0f", *extras.ReplacementFlowersQty.Float64())
			}
			pushOtherRow(fmt.Sprintf("Replacement flowers%s", qtyPart), extras.ReplacementFlowersPrice.Float64())
		}

		if extras.CollectionQty.Float64() != nil || extras.CollectionPrice.Float64() != nil {
			qtyPart := ""
			if extras.CollectionQty.Float64() != nil {
				qtyPart = fmt.Sprintf(" - Qty %.0f", *extras.CollectionQty.Float64())
			}
			pushOtherRow(fmt.Sprintf("Collection%s", qtyPart), extras.CollectionPrice.Float64())
		}

		if extras.DeliveryQty.Float64() != nil || extras.DeliveryPrice.Float64() != nil {
			qtyPart := ""
			if extras.DeliveryQty.Float64() != nil {
				qtyPart = fmt.Sprintf(" - Qty %.0f", *extras.DeliveryQty.Float64())
			}
			pushOtherRow(fmt.Sprintf("Delivery%s", qtyPart), extras.DeliveryPrice.Float64())
		}

		if extras.ReturnUnusedFlowers || extras.ReturnUnusedFlowersPrice.Float64() != nil {
			pushOtherRow("Return of unframed flowers charge", extras.ReturnUnusedFlowersPrice.Float64())
		}
	}

	return rows
}

func buildInvoiceViewModel(payload invoicePayload) invoiceViewModel {
	displayName := payload.Customer.DisplayName
	if displayName == "" {
		displayName = strings.TrimSpace(strings.Join([]string{
			payload.Customer.Title,
			payload.Customer.FirstName,
			payload.Customer.Surname,
		}, " "))
	}

	addressLines := []string{
		displayName,
		payload.Order.BillingAddressLine1,
		payload.Order.BillingAddressLine2,
		payload.Order.BillingTown,
		payload.Order.BillingCounty,
		payload.Order.BillingPostcode,
	}
	address := strings.TrimSpace(strings.Join(filterEmpty(addressLines), "\n"))
	if address == "" {
		address = "-"
	}

	notes := "Please quote your invoice number in reference."
	if payload.OrderExtras != nil && strings.TrimSpace(payload.OrderExtras.Notes) != "" {
		notes = strings.TrimSpace(payload.OrderExtras.Notes)
	}

	occasionDate := formatDate(string(payload.Order.OccasionDate))

	return invoiceViewModel{
		Address:      address,
		OccasionDate: occasionDate,
		InvoiceDate:  formatDate(time.Now().Format("2006-01-02")),
		InvoiceNo:    formatInvoiceNo(payload.Order.OrderNo.Float64()),
		Rows:         buildInvoiceRows(payload),
		Notes:        notes,
		SubTotal:     formatMoney(payload.Totals.SubTotal),
		VatTotal:     formatMoney(payload.Totals.VatTotal),
		GrandTotal:   formatMoney(payload.Totals.GrandTotal),
		Credits:      formatMoney(payload.Totals.GrandTotal),
		BalanceDue:   formatMoney(0),
	}
}

func filterEmpty(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			continue
		}
		result = append(result, value)
	}
	return result
}

// best-effort base dir resolution so relative paths work regardless of cwd
func resolvePathFromExecutable(relativeParts ...string) string {
	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		candidate := filepath.Join(append([]string{exeDir}, relativeParts...)...)
		if _, statErr := os.Stat(candidate); statErr == nil {
			return candidate
		}
	}
	cwd, _ := os.Getwd()
	return filepath.Join(append([]string{cwd}, relativeParts...)...)
}

// Parse *all* html templates in the views directory so {{template "x"}} works.
func renderInvoiceTemplate(templatePath string, view invoiceViewModel) (string, error) {
	dir := filepath.Dir(templatePath)

	if st, err := os.Stat(dir); err != nil || !st.IsDir() {
		return "", fmt.Errorf("views dir not found: %s (err=%v)", dir, err)
	}
	if _, err := os.Stat(templatePath); err != nil {
		return "", fmt.Errorf("template file not found: %s (err=%v)", templatePath, err)
	}

	pattern := filepath.Join(dir, "*.html")

	funcs := template.FuncMap{
		"safeHTML": func(s string) template.HTML { return template.HTML(s) },
	}

	tmpl, err := template.New("invoice").Funcs(funcs).Option("missingkey=error").ParseGlob(pattern)
	if err != nil {
		return "", fmt.Errorf("template.ParseGlob(%s) failed: %w", pattern, err)
	}

	mainName := filepath.Base(templatePath)

	if tmpl.Lookup(mainName) == nil {
		return "", fmt.Errorf(
			"no template named %q found (parsed templates: %s). If your file uses {{define \"...\"}}, ExecuteTemplate must use that name.",
			mainName,
			strings.Join(listTemplateNames(tmpl), ", "),
		)
	}

	var buffer bytes.Buffer
	if err := tmpl.ExecuteTemplate(&buffer, mainName, view); err != nil {
		return "", fmt.Errorf("ExecuteTemplate(%s) failed: %w", mainName, err)
	}

	return buffer.String(), nil
}

func listTemplateNames(t *template.Template) []string {
	all := t.Templates()
	out := make([]string, 0, len(all))
	for _, tt := range all {
		out = append(out, tt.Name())
	}
	return out
}

func renderInvoicePdf(html string) ([]byte, error) {
	bin := os.Getenv("INVOICE_PDF_BIN")
	if strings.TrimSpace(bin) == "" {
		bin = "wkhtmltopdf"
	}

	tempDir := os.TempDir()

	htmlFile, err := os.CreateTemp(tempDir, "invoice-*.html")
	if err != nil {
		return nil, err
	}
	defer func() { _ = htmlFile.Close() }()
	defer os.Remove(htmlFile.Name())

	if _, err := htmlFile.WriteString(html); err != nil {
		return nil, err
	}
	if err := htmlFile.Close(); err != nil {
		return nil, err
	}

	pdfPath := strings.TrimSuffix(htmlFile.Name(), ".html") + ".pdf"
	defer os.Remove(pdfPath)

	cmd := exec.Command(
		bin,
		"--enable-local-file-access",
		"--print-media-type",
		htmlFile.Name(),
		pdfPath,
	)

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			return nil, err
		}
		return nil, fmt.Errorf("wkhtmltopdf failed: %w: %s", err, msg)
	}

	return os.ReadFile(pdfPath)
}

// helper: read raw body so we can return an actionable error if JSON doesn't match
func bindPayload(e *core.RequestEvent, dst any) error {
	raw, err := io.ReadAll(e.Request.Body)
	if err != nil {
		return fmt.Errorf("read body: %w", err)
	}

	// re-set body for potential downstream reads
	e.Request.Body = io.NopCloser(bytes.NewReader(raw))

	if len(bytes.TrimSpace(raw)) == 0 {
		return errors.New("empty body")
	}

	if err := json.Unmarshal(raw, dst); err != nil {
		preview := string(raw)
		if len(preview) > 600 {
			preview = preview[:600] + "…"
		}
		return fmt.Errorf("json decode failed: %w; body=%s", err, preview)
	}

	return nil
}

func main() {
	app := pocketbase.New()

	jsvm.MustRegister(app, jsvm.Config{
		HooksDir:      "pb_hooks",
		MigrationsDir: "pb_migrations",
	})

	// PocketBase 0.34.x
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		templatePath := resolvePathFromExecutable("pb_hooks", "views", "invoice.preview.html")

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

			html, err := renderInvoiceTemplate(templatePath, view)
			if err != nil {
				fmt.Println("invoice templatePath:", templatePath)
				fmt.Println("invoice render error:", err.Error())

				return e.JSON(http.StatusInternalServerError, map[string]any{
					"ok":      false,
					"error":   "Failed to render invoice.",
					"details": err.Error(),
				})
			}

			return e.HTML(http.StatusOK, html)
		}).Bind(apis.RequireAuth())

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

			view := buildInvoiceViewModel(payload)

			html, err := renderInvoiceTemplate(templatePath, view)
			if err != nil {
				fmt.Println("invoice templatePath:", templatePath)
				fmt.Println("invoice render error:", err.Error())

				return e.JSON(http.StatusInternalServerError, map[string]any{
					"ok":      false,
					"error":   "Failed to render invoice.",
					"details": err.Error(),
					"path":    templatePath,
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

			subject := strings.TrimSpace(fmt.Sprintf("Invoice #%s", formatInvoiceNo(payload.Order.OrderNo.Float64())))
			if subject == "Invoice #-" {
				subject = "Invoice"
			}

			from := mail.Address{
				Address: app.Settings().Meta.SenderAddress,
				Name:    app.Settings().Meta.SenderName,
			}
			to := []mail.Address{
				{Address: payload.Customer.Email},
			}

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

			if err := app.NewMailClient().Send(msg); err != nil {
				return e.JSON(http.StatusInternalServerError, map[string]any{
					"ok":      false,
					"error":   "Failed to send invoice email.",
					"details": err.Error(),
				})
			}

			return e.JSON(http.StatusOK, map[string]any{"ok": true})
		}).Bind(apis.RequireAuth())

    // serving SPA
		publicDir := resolvePathFromExecutable("pb_public")
		se.Router.GET("/{path...}", apis.Static(os.DirFS(publicDir), true))

		return se.Next()
	})

	if err := app.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}

func firstNonEmpty(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
