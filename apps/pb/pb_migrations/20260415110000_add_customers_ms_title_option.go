package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var legacyCustomerTitleValues = []string{
	"Mrs",
	"Mr",
	"Miss",
}

var currentCustomerTitleValues = []string{
	"Mrs",
	"Ms",
	"Mr",
	"Miss",
}

func init() {
	m.Register(func(app core.App) error {
		return setCustomerTitleValues(app, currentCustomerTitleValues)
	}, func(app core.App) error {
		return setCustomerTitleValues(app, legacyCustomerTitleValues)
	})
}

func setCustomerTitleValues(app core.App, values []string) error {
	collection, err := app.FindCollectionByNameOrId("customers")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("title")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("title field is not a select field")
	}

	selectField.Values = append([]string{}, values...)
	return app.Save(collection)
}
