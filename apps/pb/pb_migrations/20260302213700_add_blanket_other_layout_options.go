package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		return addLayoutOptions(app, []string{"Blanket", "Other"})
	}, func(app core.App) error {
		return removeLayoutOptions(app, []string{"Blanket", "Other"})
	})
}

func addLayoutOptions(app core.App, newOptions []string) error {
	collection, err := app.FindCollectionByNameOrId("order_frame_items")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("layout")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("layout field is not a select field")
	}

	updated := false
	for _, option := range newOptions {
		if !stringSliceContains(selectField.Values, option) {
			selectField.Values = append(selectField.Values, option)
			updated = true
		}
	}

	if updated {
		return app.Save(collection)
	}

	return nil
}

func removeLayoutOptions(app core.App, optionsToRemove []string) error {
	collection, err := app.FindCollectionByNameOrId("order_frame_items")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("layout")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("layout field is not a select field")
	}

	originalValuesCount := len(selectField.Values)
	filteredValues := []string{}

	for _, value := range selectField.Values {
		shouldRemove := false
		for _, toRemove := range optionsToRemove {
			if value == toRemove {
				shouldRemove = true
				break
			}
		}
		if !shouldRemove {
			filteredValues = append(filteredValues, value)
		}
	}

	if len(filteredValues) < originalValuesCount {
		selectField.Values = filteredValues
		return app.Save(collection)
	}

	return nil
}
