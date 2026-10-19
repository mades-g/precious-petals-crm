package pb_migrations

import (
	"encoding/json"
	"strconv"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		const pageSize = 200
		offset := 0

		for {
			records, err := app.FindRecordsByFilter("order_frame_items", "", "created", pageSize, offset)
			if err != nil {
				return err
			}
			if len(records) == 0 {
				break
			}

			for _, record := range records {
				extrasMap := normalizeExtrasMap(record.Get("extras"))
				framePrice, ok := coerceFloat(extrasMap["framePrice"])
				if !ok || framePrice <= 0 {
					continue
				}
				if record.GetFloat("price") != framePrice {
					record.Set("price", framePrice)
					if err := app.Save(record); err != nil {
						return err
					}
				}
			}

			if len(records) < pageSize {
				break
			}
			offset += len(records)
		}

		return nil
	}, func(app core.App) error {
		// no-op: restoring prior totals is not deterministic
		return nil
	})
}

func normalizeExtrasMap(value any) map[string]any {
	if value == nil {
		return map[string]any{}
	}
	if m, ok := value.(map[string]any); ok {
		return m
	}
	if b, ok := value.([]byte); ok {
		out := map[string]any{}
		_ = json.Unmarshal(b, &out)
		return out
	}
	return map[string]any{}
}

func coerceFloat(value any) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case json.Number:
		if f, err := v.Float64(); err == nil {
			return f, true
		}
		return 0, false
	case string:
		if v == "" {
			return 0, false
		}
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f, true
		}
		return 0, false
	default:
		return 0, false
	}
}
