package pb_migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	minZero := 0.0

	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		if collection.Fields.GetByName("recreateButtonholeQty") == nil {
			collection.Fields.Add(&core.NumberField{
				Name: "recreateButtonholeQty",
				Min:  &minZero,
			})
		}

		if collection.Fields.GetByName("recreateButtonholePrice") == nil {
			collection.Fields.Add(&core.NumberField{
				Name: "recreateButtonholePrice",
				Min:  &minZero,
			})
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("recreateButtonholeQty")
		collection.Fields.RemoveByName("recreateButtonholePrice")
		return app.Save(collection)
	})
}
