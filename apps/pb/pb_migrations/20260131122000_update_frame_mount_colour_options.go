package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		return updateFrameMountColourOptions(app, frameMountColourNumberedToPlain)
	}, func(app core.App) error {
		return updateFrameMountColourOptions(app, frameMountColourPlainToNumbered)
	})
}

var frameMountColourNumberedToPlain = map[string]string{
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
	"Artist design":      "Artist design",
}

var frameMountColourPlainToNumbered = map[string]string{
	"Cream":       "Cream - 8674",
	"Red":         "Red - 8020",
	"Burgundy":    "Burgundy - 8151",
	"Gold":        "Gold - 8246",
	"Sage":        "Sage - 8633",
	"Silver":      "Silver - 835",
	"Blue":        "Blue - 8168",
	"Purple":      "Purple - 8146",
	"Navy":        "Navy - 8687",
	"Pink":        "Pink - 8064",
	"Maroon":      "Maroon - 8016",
	"Light Grey":  "Light Grey - 8664",
	"Bright white": "Bright white - 897",
	"Artist design": "Artist design",
}

func updateFrameMountColourOptions(app core.App, replacements map[string]string) error {
	collection, err := app.FindCollectionByNameOrId("order_frame_items")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("frameMountColour")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("frameMountColour field is not a select field")
	}

	updated := false
	for i, value := range selectField.Values {
		if replacement, ok := replacements[value]; ok && replacement != value {
			selectField.Values[i] = replacement
			updated = true
		}
	}

	for _, replacement := range replacements {
		if !stringSliceContains(selectField.Values, replacement) {
			selectField.Values = append(selectField.Values, replacement)
			updated = true
		}
	}

	if updated {
		return app.Save(collection)
	}

	return nil
}
