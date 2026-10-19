package pb_migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		collection.Fields.Add(&core.DateField{
			Name: "lastSmsSentAt",
		})
		collection.Fields.Add(&core.TextField{
			Name: "lastSmsBody",
		})
		collection.Fields.Add(&core.SelectField{
			Name:      "lastSmsType",
			MaxSelect: 1,
			Values: []string{
				"deposit_reminder",
				"paperweight_received",
				"framing_complete",
				"custom",
			},
		})
		collection.Fields.Add(&core.SelectField{
			Name:      "lastSmsStatus",
			MaxSelect: 1,
			Values: []string{
				"sent",
				"failed",
			},
		})
		collection.Fields.Add(&core.TextField{
			Name: "lastSmsError",
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("lastSmsSentAt")
		collection.Fields.RemoveByName("lastSmsBody")
		collection.Fields.RemoveByName("lastSmsType")
		collection.Fields.RemoveByName("lastSmsStatus")
		collection.Fields.RemoveByName("lastSmsError")
		return app.Save(collection)
	})
}
