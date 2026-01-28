package main

import (
	"bytes"
	"html/template"
	"path/filepath"
)

func renderEmailTemplate(viewsDir string, templateFilename string, data any) (string, error) {
	// Parse layout + the specific template.
	layoutPath := filepath.Join(viewsDir, "email.layout.html")
	bodyPath := filepath.Join(viewsDir, templateFilename)

	tpl, err := template.ParseFiles(layoutPath, bodyPath)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
