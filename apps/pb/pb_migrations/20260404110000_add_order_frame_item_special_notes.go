package pb_migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("order_frame_items")
		if err != nil {
			return err
		}

		if collection.Fields.GetByName("special_notes") == nil {
			collection.Fields.Add(&core.TextField{
				Name: "special_notes",
			})
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("order_frame_items")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("special_notes")
		return app.Save(collection)
	})
}
