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
			name: "skip order without bouquet data",
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
