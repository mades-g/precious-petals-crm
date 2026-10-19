package pb_migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	minZero := 0.0

	m.Register(func(app core.App) error {
		orders, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		addOrderExtraBoolField(orders, "collection")
		addOrderExtraBoolField(orders, "delivery")
		addOrderExtraBoolField(orders, "recreateButtonhole")
		if err := app.Save(orders); err != nil {
			return err
		}

		if err := backfillOrderExtraEnabledFlags(app); err != nil {
			return err
		}

		orders, err = app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		orders.Fields.RemoveByName("replacementFlowersQty")
		orders.Fields.RemoveByName("collectionQty")
		orders.Fields.RemoveByName("deliveryQty")
		orders.Fields.RemoveByName("recreateButtonholeQty")
		return app.Save(orders)
	}, func(app core.App) error {
		orders, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		addOrderExtraNumberField(orders, "replacementFlowersQty", &minZero)
		addOrderExtraNumberField(orders, "collectionQty", &minZero)
		addOrderExtraNumberField(orders, "deliveryQty", &minZero)
		addOrderExtraNumberField(orders, "recreateButtonholeQty", &minZero)
		if err := app.Save(orders); err != nil {
			return err
		}

		if err := backfillOrderExtraQtyFields(app); err != nil {
			return err
		}

		orders, err = app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		orders.Fields.RemoveByName("collection")
		orders.Fields.RemoveByName("delivery")
		orders.Fields.RemoveByName("recreateButtonhole")
		return app.Save(orders)
	})
}

func addOrderExtraBoolField(collection *core.Collection, name string) {
	if collection.Fields.GetByName(name) != nil {
		return
	}

	collection.Fields.Add(&core.BoolField{
		Name: name,
	})
}

func addOrderExtraNumberField(collection *core.Collection, name string, min *float64) {
	if collection.Fields.GetByName(name) != nil {
		return
	}

	collection.Fields.Add(&core.NumberField{
		Name: name,
		Min:  min,
	})
}

func backfillOrderExtraEnabledFlags(app core.App) error {
	const pageSize = 200
	offset := 0

	for {
		orders, err := app.FindRecordsByFilter("orders", "", "created", pageSize, offset)
		if err != nil {
			return err
		}
		if len(orders) == 0 {
			break
		}

		for _, order := range orders {
			order.Set(
				"replacementFlowers",
				order.GetBool("replacementFlowers") || order.GetFloat("replacementFlowersQty") > 0,
			)
			order.Set("collection", order.GetFloat("collectionQty") > 0)
			order.Set("delivery", order.GetFloat("deliveryQty") > 0)
			order.Set("recreateButtonhole", order.GetFloat("recreateButtonholeQty") > 0)
			if err := app.Save(order); err != nil {
				return err
			}
		}

		if len(orders) < pageSize {
			break
		}
		offset += len(orders)
	}

	return nil
}

func backfillOrderExtraQtyFields(app core.App) error {
	const pageSize = 200
	offset := 0

	for {
		orders, err := app.FindRecordsByFilter("orders", "", "created", pageSize, offset)
		if err != nil {
			return err
		}
		if len(orders) == 0 {
			break
		}

		for _, order := range orders {
			order.Set("replacementFlowersQty", boolToQty(order.GetBool("replacementFlowers")))
			order.Set("collectionQty", boolToQty(order.GetBool("collection")))
			order.Set("deliveryQty", boolToQty(order.GetBool("delivery")))
			order.Set("recreateButtonholeQty", boolToQty(order.GetBool("recreateButtonhole")))
			if err := app.Save(order); err != nil {
				return err
			}
		}

		if len(orders) < pageSize {
			break
		}
		offset += len(orders)
	}

	return nil
}

func boolToQty(value bool) float64 {
	if value {
		return 1
	}
	return 0
}
