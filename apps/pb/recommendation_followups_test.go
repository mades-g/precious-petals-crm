package main

import (
	"testing"
	"time"
)

func TestRecommendationReminderStateEligibility(t *testing.T) {
	tests := []struct {
		name  string
		state recommendationReminderState
		want  bool
	}{
		{
			name: "eligible to choose bouquet order",
			state: recommendationReminderState{
				OrderStatus:   "to_choose",
				PaymentStatus: "waiting_second_deposit",
				FrameCount:    1,
				CustomerEmail: "customer@example.com",
			},
			want: true,
		},
		{
			name: "eligible to choose paperweight only order",
			state: recommendationReminderState{
				OrderStatus:       "to_choose",
				PaymentStatus:     "waiting_second_deposit",
				FrameCount:        0,
				PaperweightItemId: "paperweight-1",
				CustomerEmail:     "customer@example.com",
			},
			want: true,
		},
		{
			name: "skip non to choose order",
			state: recommendationReminderState{
				OrderStatus:   "chosen",
				PaymentStatus: "waiting_second_deposit",
				FrameCount:    1,
				CustomerEmail: "customer@example.com",
			},
			want: false,
		},
		{
			name: "skip soft deleted order",
			state: recommendationReminderState{
				IsDeleted:     true,
				OrderStatus:   "to_choose",
				PaymentStatus: "waiting_second_deposit",
				FrameCount:    1,
				CustomerEmail: "customer@example.com",
			},
			want: false,
		},
		{
			name: "skip order without recommendation items",
			state: recommendationReminderState{
				OrderStatus:   "to_choose",
				PaymentStatus: "waiting_second_deposit",
				FrameCount:    0,
				CustomerEmail: "customer@example.com",
			},
			want: false,
		},
		{
			name: "skip order without customer email",
			state: recommendationReminderState{
				OrderStatus:   "to_choose",
				PaymentStatus: "waiting_second_deposit",
				FrameCount:    1,
				CustomerEmail: "",
			},
			want: false,
		},
		{
			name: "skip second deposit paid",
			state: recommendationReminderState{
				OrderStatus:   "to_choose",
				PaymentStatus: "second_deposit_paid",
				FrameCount:    1,
				CustomerEmail: "customer@example.com",
			},
			want: false,
		},
		{
			name: "skip waiting final balance",
			state: recommendationReminderState{
				OrderStatus:   "to_choose",
				PaymentStatus: "waiting_final_balance",
				FrameCount:    1,
				CustomerEmail: "customer@example.com",
			},
			want: false,
		},
		{
			name: "skip final balance paid",
			state: recommendationReminderState{
				OrderStatus:   "to_choose",
				PaymentStatus: "final_balance_paid",
				FrameCount:    1,
				CustomerEmail: "customer@example.com",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.state.IsEligible(); got != tt.want {
				t.Fatalf("IsEligible() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBuildRecommendationPayloadFromRecordsIncludesPaperweightOnlyOrder(t *testing.T) {
	order := newExportTestRecord("orders", map[string]any{
		"orderNo":      30145,
		"occasionDate": "2026-06-20",
	})
	order.Id = "order-1"
	customer := newExportTestRecord("customers", map[string]any{
		"title":     "Mrs",
		"firstName": "Gemma",
		"surname":   "Wingrove",
		"email":     "customer@example.com",
	})
	customer.Id = "customer-1"
	paperweight := newExportTestRecord("order_paperweight_items", map[string]any{
		"quantity": 2,
		"price":    120,
	})
	paperweight.Id = "paperweight-1"

	payload, err := buildRecommendationPayloadFromRecords(order, customer, nil, paperweight)
	if err != nil {
		t.Fatalf("buildRecommendationPayloadFromRecords() error = %v", err)
	}

	if len(payload.Frames) != 0 {
		t.Fatalf("expected no frame payloads, got %d", len(payload.Frames))
	}
	if payload.GetPaperweight() == nil {
		t.Fatal("expected paperweight payload")
	}
	if got := payload.GetPaperweight().Quantity.Float64(); got == nil || *got != 2 {
		t.Fatalf("paperweight quantity = %v, want 2", got)
	}
	if got := payload.GetPaperweight().Price.Float64(); got == nil || *got != 120 {
		t.Fatalf("paperweight price = %v, want 120", got)
	}
}

func TestBuildRecommendationFollowUpLogContextIncludesPaperweight(t *testing.T) {
	order := newExportTestRecord("orders", nil)
	order.Id = "order-1"
	customer := newExportTestRecord("customers", nil)
	customer.Id = "customer-1"
	paperweight := newExportTestRecord("order_paperweight_items", nil)
	paperweight.Id = "paperweight-1"

	ctx, meta := buildRecommendationFollowUpLogContext(order, customer, nil, paperweight)

	if ctx.PaperweightItemId != "paperweight-1" {
		t.Fatalf("PaperweightItemId = %q, want paperweight-1", ctx.PaperweightItemId)
	}
	if ctx.FrameItemId != "" {
		t.Fatalf("FrameItemId = %q, want empty", ctx.FrameItemId)
	}
	if meta["hasPaperweight"] != true {
		t.Fatalf("hasPaperweight meta = %v, want true", meta["hasPaperweight"])
	}
	if meta["frameCount"] != 0 {
		t.Fatalf("frameCount meta = %v, want 0", meta["frameCount"])
	}
}

func TestRecommendationExpectedSuccessCount(t *testing.T) {
	location, err := time.LoadLocation(londonTimezoneName)
	if err != nil {
		t.Fatalf("LoadLocation() error = %v", err)
	}

	firstSuccess := time.Date(2026, time.April, 1, 9, 0, 0, 0, location)
	tests := []struct {
		name string
		now  time.Time
		want int
	}{
		{
			name: "before first reminder window",
			now:  time.Date(2026, time.April, 14, 8, 59, 0, 0, location),
			want: 1,
		},
		{
			name: "first reminder due on day fourteen",
			now:  time.Date(2026, time.April, 15, 9, 0, 0, 0, location),
			want: 2,
		},
		{
			name: "second reminder due on day twenty eight",
			now:  time.Date(2026, time.April, 29, 9, 0, 0, 0, location),
			want: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := recommendationExpectedSuccessCount(tt.now, firstSuccess, location); got != tt.want {
				t.Fatalf("recommendationExpectedSuccessCount() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestIsRecommendationReminderDue(t *testing.T) {
	location, err := time.LoadLocation(londonTimezoneName)
	if err != nil {
		t.Fatalf("LoadLocation() error = %v", err)
	}

	firstSuccess := time.Date(2026, time.April, 1, 9, 0, 0, 0, location)
	tests := []struct {
		name               string
		now                time.Time
		actualSuccessCount int
		want               bool
	}{
		{
			name:               "not due before two weeks",
			now:                time.Date(2026, time.April, 14, 9, 0, 0, 0, location),
			actualSuccessCount: 1,
			want:               false,
		},
		{
			name:               "due at first two week threshold",
			now:                time.Date(2026, time.April, 15, 9, 0, 0, 0, location),
			actualSuccessCount: 1,
			want:               true,
		},
		{
			name:               "manual successful resend prevents duplicate follow up",
			now:                time.Date(2026, time.April, 15, 9, 0, 0, 0, location),
			actualSuccessCount: 2,
			want:               false,
		},
		{
			name:               "same order becomes due again on day twenty eight",
			now:                time.Date(2026, time.April, 29, 9, 0, 0, 0, location),
			actualSuccessCount: 2,
			want:               true,
		},
		{
			name:               "failed automated send retries next day because success count is unchanged",
			now:                time.Date(2026, time.April, 16, 9, 0, 0, 0, location),
			actualSuccessCount: 1,
			want:               true,
		},
		{
			name:               "no initial successful recommendation means no reminder",
			now:                time.Date(2026, time.April, 16, 9, 0, 0, 0, location),
			actualSuccessCount: 0,
			want:               false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isRecommendationReminderDue(tt.now, firstSuccess, tt.actualSuccessCount, location); got != tt.want {
				t.Fatalf("isRecommendationReminderDue() = %v, want %v", got, tt.want)
			}
		})
	}
}
