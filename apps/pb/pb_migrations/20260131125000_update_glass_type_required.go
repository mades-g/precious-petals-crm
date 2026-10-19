package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		if err := updateGlassTypeField(app, true); err != nil {
			return err
		}
		return migrateGlassTypeDefaults(app)
	}, func(app core.App) error {
		return updateGlassTypeField(app, false)
	})
}

func updateGlassTypeField(app core.App, required bool) error {
	collection, err := app.FindCollectionByNameOrId("order_frame_items")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("glassType")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("glassType field is not a select field")
	}

	selectField.Required = required
	selectField.Values = normalizeGlassTypeValues(selectField.Values)

	return app.Save(collection)
}

func normalizeGlassTypeValues(values []string) []string {
	normalized := []string{}
	for _, value := range values {
		if value == "" || value == "none" {
			continue
		}
		if !stringSliceContains(normalized, value) {
			normalized = append(normalized, value)
		}
	}

	required := []string{"Clearview uv glass", "Conservation glass"}
	for _, value := range required {
		if !stringSliceContains(normalized, value) {
			normalized = append(normalized, value)
		}
	}

	return normalized
}

func migrateGlassTypeDefaults(app core.App) error {
	const pageSize = 200
	offset := 0

	for {
		records, err := app.FindRecordsByFilter(
			"order_frame_items",
			`glassType = "" || glassType = "none"`,
			"created",
			pageSize,
			offset,
		)
		if err != nil {
			return err
		}
		if len(records) == 0 {
			break
		}

		for _, record := range records {
			normalizeFrameMountColour(record)
			record.Set("glassType", "Conservation glass")
			if err := app.Save(record); err != nil {
				return err
			}
		}

		if len(records) < pageSize {
			break
		}
		offset += len(records)
	}

	return nil
}

func normalizeFrameMountColour(record *core.Record) {
	value := record.GetString("frameMountColour")
	if value == "" {
		return
	}

	if replacement, ok := glassTypeMountColourMap[value]; ok {
		record.Set("frameMountColour", replacement)
	}
}

var glassTypeMountColourMap = map[string]string{
	"Cream - 8674":       "Cream",
	"Red - 8020":         "Red",
	"Burgundy - 8151":    "Burgundy",
	"Gold - 8246":        "Gold",
	"Sage - 8633":        "Sage",
	"Silver - 835":       "Silver",
	"Blue - 8168":        "Blue",
	"Purple - 8146":      "Purple",
	"Navy - 8687":        "Navy",
	"Pink - 8064":        "Pink",
	"Maroon - 8016":      "Maroon",
	"Light Grey - 8664":  "Light Grey",
	"Bright white - 897": "Bright white",
}
