package pb_migrations

import (
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var draftLifecycleOrderStatusValues = []string{
	"draft",
	"to_choose",
	"chosen",
	"in_progress",
	"left_the_studio",
	"cancelled",
}

func init() {
	m.Register(func(app core.App) error {
		if err := setOrderStatusValues(app, draftLifecycleOrderStatusValues); err != nil {
			return err
		}

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
				paymentStatus := strings.TrimSpace(order.GetString("payment_status"))
				nextStatus := currentStatus

				switch currentStatus {
				case "ready":
					nextStatus = "in_progress"
				case "delivered", "collected":
					nextStatus = "left_the_studio"
				case "in_progress":
					if paymentStatus != "second_deposit_paid" &&
						paymentStatus != "waiting_final_balance" &&
						paymentStatus != "final_balance_paid" {
						nextStatus = "draft"
					}
				}

				if nextStatus == currentStatus {
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
	}, func(app core.App) error {
		if err := setOrderStatusValues(app, currentOrderStatusValues); err != nil {
			return err
		}

		return migrateOrderStatuses(app, map[string]string{
			"draft": "in_progress",
		})
	})
}
