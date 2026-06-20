package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var legacySmsTypeValues = []string{
	"deposit_reminder",
	"paperweight_received",
	"framing_complete",
	"custom",
}

var currentSmsTypeValues = []string{
	"deposit_reminder",
	"paperweight_received",
	"framing_complete",
	"chase_to_choose",
	"order_ready",
	"invite_to_pay_final_balance",
	"custom",
}

func init() {
	m.Register(func(app core.App) error {
		if err := setSmsTypeValues(app, "orders", "lastSmsType", currentSmsTypeValues); err != nil {
			return err
		}

		return setSmsTypeValues(app, "sms_logs", "type", currentSmsTypeValues)
	}, func(app core.App) error {
		if err := setSmsTypeValues(app, "orders", "lastSmsType", legacySmsTypeValues); err != nil {
			return err
		}

		return setSmsTypeValues(app, "sms_logs", "type", legacySmsTypeValues)
	})
}

func setSmsTypeValues(app core.App, collectionName, fieldName string, values []string) error {
	collection, err := app.FindCollectionByNameOrId(collectionName)
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName(fieldName)
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New(fieldName + " field is not a select field")
	}

	selectField.Values = append([]string{}, values...)
	return app.Save(collection)
}
