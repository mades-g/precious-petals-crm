package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		return setSmsProviderValues(app, []string{"txtlocal", "webex_interact"})
	}, func(app core.App) error {
		return setSmsProviderValues(app, []string{"txtlocal"})
	})
}

func setSmsProviderValues(app core.App, values []string) error {
	collection, err := app.FindCollectionByNameOrId("sms_logs")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("provider")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("provider field is not a select field")
	}

	selectField.Values = append([]string{}, values...)
	return app.Save(collection)
}
