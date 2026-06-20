package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("order_frame_items")
		if err != nil {
			return err
		}

		field := collection.Fields.GetByName("frameMountColour")
		selectField, ok := field.(*core.SelectField)
		if !ok {
			return errors.New("frameMountColour field is not a select field")
		}

		option := "No Second Mount"
		if !stringSliceContains(selectField.Values, option) {
			selectField.Values = append([]string{option}, selectField.Values...)
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("order_frame_items")
		if err != nil {
			return err
		}

		field := collection.Fields.GetByName("frameMountColour")
		selectField, ok := field.(*core.SelectField)
		if !ok {
			return errors.New("frameMountColour field is not a select field")
		}

		option := "No Second Mount"
		if stringSliceContains(selectField.Values, option) {
			remaining := make([]string, 0, len(selectField.Values))
			for _, value := range selectField.Values {
				if value != option {
					remaining = append(remaining, value)
				}
			}
			selectField.Values = remaining
		}

		return app.Save(collection)
	})
}

func stringSliceContains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
