package pb_migrations

import (
	"fmt"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		orders, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}

		addBoolField(orders, "artworkComplete")
		addBoolField(orders, "framingComplete")
		if err := app.Save(orders); err != nil {
			return err
		}

		if err := backfillOrderCompletion(app); err != nil {
			return err
		}

		frameItems, err := app.FindCollectionByNameOrId("order_frame_items")
		if err != nil {
			return err
		}
		frameItems.Fields.RemoveByName("artworkComplete")
		frameItems.Fields.RemoveByName("framingComplete")
		return app.Save(frameItems)
	}, func(app core.App) error {
		frameItems, err := app.FindCollectionByNameOrId("order_frame_items")
		if err != nil {
			return err
		}

		addBoolField(frameItems, "artworkComplete")
		addBoolField(frameItems, "framingComplete")
		if err := app.Save(frameItems); err != nil {
			return err
		}

		if err := backfillFrameCompletion(app); err != nil {
			return err
		}

		orders, err := app.FindCollectionByNameOrId("orders")
		if err != nil {
			return err
		}
		orders.Fields.RemoveByName("artworkComplete")
		orders.Fields.RemoveByName("framingComplete")
		return app.Save(orders)
	})
}

func addBoolField(collection *core.Collection, name string) {
	if collection.Fields.GetByName(name) != nil {
		return
	}
	collection.Fields.Add(&core.BoolField{
		Name: name,
	})
}

func backfillOrderCompletion(app core.App) error {
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
			frameIds := order.GetStringSlice("frameOrderId")
			allArtwork, allFraming := calculateFrameCompletion(app, frameIds)
			order.Set("artworkComplete", allArtwork)
			order.Set("framingComplete", allFraming)
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

func backfillFrameCompletion(app core.App) error {
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
			frameIds := order.GetStringSlice("frameOrderId")
			if len(frameIds) == 0 {
				continue
			}
			frames, err := fetchRecordsByIds(app, "order_frame_items", frameIds)
			if err != nil {
				return err
			}

			artwork := order.GetBool("artworkComplete")
			framing := order.GetBool("framingComplete")
			for _, frame := range frames {
				frame.Set("artworkComplete", artwork)
				frame.Set("framingComplete", framing)
				if err := app.Save(frame); err != nil {
					return err
				}
			}
		}

		if len(orders) < pageSize {
			break
		}
		offset += len(orders)
	}

	return nil
}

func calculateFrameCompletion(app core.App, frameIds []string) (bool, bool) {
	if len(frameIds) == 0 {
		return false, false
	}

	frames, err := fetchRecordsByIds(app, "order_frame_items", frameIds)
	if err != nil || len(frames) == 0 {
		return false, false
	}

	allArtwork := true
	allFraming := true
	for _, frame := range frames {
		if !frame.GetBool("artworkComplete") {
			allArtwork = false
		}
		if !frame.GetBool("framingComplete") {
			allFraming = false
		}
	}

	return allArtwork, allFraming
}

func fetchRecordsByIds(app core.App, collection string, ids []string) ([]*core.Record, error) {
	return fetchRecordsByField(app, collection, "id", ids)
}

func fetchRecordsByField(app core.App, collection, field string, values []string) ([]*core.Record, error) {
	if len(values) == 0 {
		return []*core.Record{}, nil
	}

	result := []*core.Record{}
	for start := 0; start < len(values); start += 200 {
		end := minInt(start+200, len(values))
		filter := buildOrFilter(field, values[start:end])
		if filter == "" {
			continue
		}
		records, err := app.FindRecordsByFilter(collection, filter, "", len(values[start:end]), 0)
		if err != nil {
			return nil, err
		}
		result = append(result, records...)
	}

	return result, nil
}

func buildOrFilter(field string, values []string) string {
	conds := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			continue
		}
		conds = append(conds, fmt.Sprintf(`%s = "%s"`, field, escapeFilterValue(value)))
	}

	if len(conds) == 0 {
		return ""
	}
	if len(conds) == 1 {
		return conds[0]
	}
	return "(" + strings.Join(conds, " || ") + ")"
}

func escapeFilterValue(value string) string {
	return strings.ReplaceAll(value, `"`, `\"`)
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
