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
	layoutName := filepath.Base(layoutPath)

	tpl, err := template.New("email").Funcs(template.FuncMap{
		"safeURL": func(s string) template.URL { return template.URL(s) },
	}).ParseFiles(layoutPath, bodyPath)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tpl.ExecuteTemplate(&buf, layoutName, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}
