package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		return updateOrderPaymentsAmountRequired(app, false)
	}, func(app core.App) error {
		return updateOrderPaymentsAmountRequired(app, true)
	})
}

func updateOrderPaymentsAmountRequired(app core.App, required bool) error {
	collection, err := app.FindCollectionByNameOrId("order_payments")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("amount")
	numberField, ok := field.(*core.NumberField)
	if !ok {
		return errors.New("amount field is not a number field")
	}

	numberField.Required = required

	return app.Save(collection)
}
