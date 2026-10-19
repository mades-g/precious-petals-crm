package pb_migrations

import (
	"fmt"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

const legacyToChooseOrdersPageSize = 200

func init() {
	m.Register(func(app core.App) error {
		orders, err := collectLegacyToChooseOrders(app)
		if err != nil {
			return err
		}

		for _, order := range orders {
			hasSentRecommendation, err := orderHasSentRecommendationEmail(app, order.Id)
			if err != nil {
				return err
			}
			if hasSentRecommendation {
				continue
			}

			order.Set("orderStatus", "draft")
			if err := app.Save(order); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		return nil
	})
}

func collectLegacyToChooseOrders(app core.App) ([]*core.Record, error) {
	const filter = `isDeleted = false && orderStatus = "to_choose"`

	orders := make([]*core.Record, 0)
	offset := 0

	for {
		page, err := app.FindRecordsByFilter(
			"orders",
			filter,
			"created",
			legacyToChooseOrdersPageSize,
			offset,
		)
		if err != nil {
			return nil, err
		}
		if len(page) == 0 {
			return orders, nil
		}

		orders = append(orders, page...)
		if len(page) < legacyToChooseOrdersPageSize {
			return orders, nil
		}

		offset += len(page)
	}
}

func orderHasSentRecommendationEmail(app core.App, orderID string) (bool, error) {
	filter := fmt.Sprintf(
		`orderId = "%s" && channel = "email" && status = "sent" && emailType = "recommendation_bouquet"`,
		escapeFilterValue(orderID),
	)

	logs, err := app.FindRecordsByFilter("email_logs", filter, "sentAt", 1, 0)
	if err != nil {
		return false, err
	}

	return len(logs) > 0, nil
}
