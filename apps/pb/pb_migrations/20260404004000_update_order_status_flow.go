package pb_migrations

import (
	"errors"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var currentOrderStatusValues = []string{
	"in_progress",
	"to_choose",
	"chosen",
	"ready",
	"left_the_studio",
	"cancelled",
}

var previousOrderStatusValues = []string{
	"in_progress",
	"ready",
	"delivered",
	"collected",
	"cancelled",
}

func init() {
	m.Register(func(app core.App) error {
		if err := setOrderStatusValues(app, currentOrderStatusValues); err != nil {
			return err
		}

		return migrateOrderStatuses(app, map[string]string{
			"delivered": "left_the_studio",
			"collected": "left_the_studio",
		})
	}, func(app core.App) error {
		if err := setOrderStatusValues(app, previousOrderStatusValues); err != nil {
			return err
		}

		return migrateOrderStatuses(app, map[string]string{
			"to_choose":       "in_progress",
			"chosen":          "in_progress",
			"left_the_studio": "collected",
		})
	})
}

func setOrderStatusValues(app core.App, values []string) error {
	collection, err := app.FindCollectionByNameOrId("orders")
	if err != nil {
		return err
	}

	field := collection.Fields.GetByName("orderStatus")
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return errors.New("orderStatus field is not a select field")
	}

	selectField.Values = append([]string{}, values...)
	return app.Save(collection)
}

func migrateOrderStatuses(app core.App, replacements map[string]string) error {
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
			currentStatus := strings.TrimSpace(order.GetString("orderStatus"))
			nextStatus, ok := replacements[currentStatus]
			if !ok || nextStatus == currentStatus {
				continue
			}

			order.Set("orderStatus", nextStatus)
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
