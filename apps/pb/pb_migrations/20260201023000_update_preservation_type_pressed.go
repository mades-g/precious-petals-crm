package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		if err := updatePreservationTypeOptions(app, "pressed", "Pressed"); err != nil {
			return err
		}
		return migratePreservationTypeValues(app, "pressed", "Pressed")
	}, func(app core.App) error {
		if err := updatePreservationTypeOptions(app, "Pressed", "pressed"); err != nil {
			return err
		}
		return migratePreservationTypeValues(app, "Pressed", "pressed")
	})
}

func updatePreservationTypeOptions(app core.App, from, to string) error {
	collection, err := app.FindCollectionByNameOrId("order_frame_items")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("preservationType")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("preservationType field is not a select field")
	}

	selectField.Values = replaceOption(selectField.Values, from, to)
	if !stringSliceContains(selectField.Values, to) {
		selectField.Values = append(selectField.Values, to)
	}

	return app.Save(collection)
}

func replaceOption(values []string, from, to string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value == from {
			out = append(out, to)
		} else {
			out = append(out, value)
		}
	}
	return out
}

func migratePreservationTypeValues(app core.App, from, to string) error {
	const pageSize = 200
	offset := 0

	for {
		records, err := app.FindRecordsByFilter(
			"order_frame_items",
			`preservationType = "`+from+`"`,
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
			record.Set("preservationType", to)
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
