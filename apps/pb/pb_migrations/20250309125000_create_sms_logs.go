package pb_migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		ordersCollection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}
		customersCollection, err := app.FindCollectionByNameOrId("customers")
		if err != nil {
			return err
		}

		collection := core.NewBaseCollection("sms_logs")
		authRule := "@request.auth.id != ''"
		collection.ListRule = types.Pointer(authRule)
		collection.ViewRule = types.Pointer(authRule)
		collection.CreateRule = types.Pointer(authRule)
		collection.UpdateRule = types.Pointer(authRule)
		collection.DeleteRule = types.Pointer(authRule)

		collection.Fields.Add(&core.RelationField{
			Name:          "orderId",
			Required:      true,
			CollectionId:  ordersCollection.Id,
			MaxSelect:     1,
			CascadeDelete: true,
		})
		collection.Fields.Add(&core.RelationField{
			Name:         "customerId",
			CollectionId: customersCollection.Id,
			MaxSelect:    1,
		})
		collection.Fields.Add(&core.TextField{
			Name:     "toNumber",
			Required: true,
		})
		collection.Fields.Add(&core.TextField{
			Name:     "sender",
			Required: true,
		})
		collection.Fields.Add(&core.SelectField{
			Name:      "type",
			Required:  true,
			MaxSelect: 1,
			Values: []string{
				"deposit_reminder",
				"paperweight_received",
				"framing_complete",
				"custom",
			},
		})
		collection.Fields.Add(&core.TextField{
			Name:     "body",
			Required: true,
		})
		collection.Fields.Add(&core.SelectField{
			Name:      "provider",
			Required:  true,
			MaxSelect: 1,
			Values: []string{
				"txtlocal",
			},
		})
		collection.Fields.Add(&core.TextField{
			Name: "providerMessageId",
		})
		collection.Fields.Add(&core.SelectField{
			Name:      "status",
			Required:  true,
			MaxSelect: 1,
			Values: []string{
				"sent",
				"failed",
			},
		})
		collection.Fields.Add(&core.TextField{
			Name: "error",
		})
		collection.Fields.Add(&core.DateField{
			Name:     "sentAt",
			Required: true,
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("sms_logs")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
