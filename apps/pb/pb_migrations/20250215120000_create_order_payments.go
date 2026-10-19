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

		collection := core.NewBaseCollection("order_payments")
		authRule := "@request.auth.id != ''"
		collection.ListRule = types.Pointer(authRule)
		collection.ViewRule = types.Pointer(authRule)
		collection.CreateRule = types.Pointer(authRule)
		collection.UpdateRule = types.Pointer(authRule)
		collection.DeleteRule = types.Pointer(authRule)

		minAmount := 0.0
		collection.Fields.Add(&core.RelationField{
			Name:          "orderId",
			Required:      true,
			CollectionId:  ordersCollection.Id,
			MaxSelect:     1,
			CascadeDelete: true,
		})
		collection.Fields.Add(&core.NumberField{
			Name:     "amount",
			Required: true,
			Min:      &minAmount,
		})
		collection.Fields.Add(&core.SelectField{
			Name:     "paymentType",
			Required: true,
			MaxSelect: 1,
			Values: []string{
				"first_deposit",
				"second_deposit",
				"final_balance",
				"other",
			},
		})
		collection.Fields.Add(&core.DateField{
			Name: "paidAt",
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("order_payments")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
