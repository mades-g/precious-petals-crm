package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		field := collection.Fields.GetByName("orderStatus")
		selectField, ok := field.(*core.SelectField)
		if !ok {
			return errors.New("orderStatus field is not a select field")
		}

		selectField.Values = removeString(selectField.Values, "draft")
		if !stringSliceContains(selectField.Values, "in_progress") {
			selectField.Values = append(selectField.Values, "in_progress")
		}

		if err := app.Save(collection); err != nil {
			return err
		}

		return migrateDraftOrders(app)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		field := collection.Fields.GetByName("orderStatus")
		selectField, ok := field.(*core.SelectField)
		if !ok {
			return errors.New("orderStatus field is not a select field")
		}

		if !stringSliceContains(selectField.Values, "draft") {
			selectField.Values = append(selectField.Values, "draft")
		}

		return app.Save(collection)
	})
}

func migrateDraftOrders(app core.App) error {
	const pageSize = 200
	offset := 0

	for {
		orders, err := app.FindRecordsByFilter("orders", `orderStatus = "draft"`, "created", pageSize, offset)
		if err != nil {
			return err
		}
		if len(orders) == 0 {
			break
		}

		for _, order := range orders {
			order.Set("orderStatus", "in_progress")
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

func removeString(values []string, target string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value != target {
			out = append(out, value)
		}
	}
	return out
}
