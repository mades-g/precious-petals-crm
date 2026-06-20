package pb_migrations

import (
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var readyLifecycleOrderStatusValues = []string{
	"draft",
	"to_choose",
	"chosen",
	"in_progress",
	"ready",
	"left_the_studio",
	"cancelled",
}

func init() {
	m.Register(func(app core.App) error {
		if err := setOrderStatusValues(app, readyLifecycleOrderStatusValues); err != nil {
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
				if strings.TrimSpace(order.GetString("orderStatus")) != "in_progress" {
					continue
				}

				frameIds := order.GetStringSlice("frameOrderId")
				hasFrames := len(frameIds) > 0
				framesComplete := !hasFrames || (order.GetBool("artworkComplete") && order.GetBool("framingComplete"))

				pwId := strings.TrimSpace(order.GetString("paperweightOrderId"))
				paperweightComplete := true
				if pwId != "" {
					pw, err := app.FindRecordById("order_paperweight_items", pwId)
					if err != nil {
						return err
					}
					paperweightComplete = pw.GetBool("paperweightReceived")
				}

				if !framesComplete || !paperweightComplete {
					continue
				}

				order.Set("orderStatus", "ready")
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
		if err := setOrderStatusValues(app, draftLifecycleOrderStatusValues); err != nil {
			return err
		}

		return migrateOrderStatuses(app, map[string]string{
			"ready": "in_progress",
		})
	})
}
