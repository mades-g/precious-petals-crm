package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		return updateLayoutOption(app, "Hand tied birds eve", "Hand tied birds eye")
	}, func(app core.App) error {
		return updateLayoutOption(app, "Hand tied birds eye", "Hand tied birds eve")
	})
}

func updateLayoutOption(app core.App, from string, to string) error {
	collection, err := app.FindCollectionByNameOrId("order_frame_items")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("layout")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("layout field is not a select field")
	}

	if replaceString(selectField.Values, from, to) {
		return app.Save(collection)
	}

	if !stringSliceContains(selectField.Values, to) {
		selectField.Values = append(selectField.Values, to)
		return app.Save(collection)
	}

	return nil
}

func replaceString(values []string, from string, to string) bool {
	for i, value := range values {
		if value == from {
			values[i] = to
			return true
		}
	}
	return false
}
