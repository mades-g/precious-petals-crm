package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

const (
	recommendationReminderCronEnv     = "PB_RECOMMENDATION_REMINDER_CRON"
	recommendationReminderCronDefault = "0 9 * * *"
	recommendationReminderCronJobID   = "recommendation_followup_reminders"
	recommendationReminderSource      = "cron_recommendation_followup"
	recommendationReminderInterval    = 14
	londonTimezoneName                = "Europe/London"
)

type recommendationEmailService struct {
	app              *pocketbase.PocketBase
	resend           *ResendClient
	viewsDir         string
	emailLogoDataURI string
}

type recommendationReminderState struct {
	IsDeleted     bool
	OrderStatus   string
	PaymentStatus string
	FrameCount    int
	CustomerEmail string
}

type recommendationEmailSendError struct {
	PublicMessage string
	Cause         error
}

func (e *recommendationEmailSendError) Error() string {
	if e == nil || e.Cause == nil {
		return ""
	}
	return e.Cause.Error()
}

func (e *recommendationEmailSendError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func newRecommendationEmailService(app *pocketbase.PocketBase, resend *ResendClient, emailLogoDataURI string) recommendationEmailService {
	return recommendationEmailService{
		app:              app,
		resend:           resend,
		viewsDir:         resolvePathFromExecutable("pb_hooks", "views"),
		emailLogoDataURI: emailLogoDataURI,
	}
}

func (s recommendationEmailService) send(ctx context.Context, e *core.RequestEvent, payload invoicePayload, logCtx emailLogContext, meta map[string]any) error {
	originalTo := strings.TrimSpace(payload.Customer.Email)
	if originalTo == "" {
		return errors.New("missing customer email")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	toEmail := originalTo
	if devOverride := strings.TrimSpace(os.Getenv("RESEND_DEV_OVERRIDE_TO")); devOverride != "" {
		toEmail = devOverride
	}

	metaCopy := cloneMeta(meta)
	if toEmail != originalTo {
		metaCopy["recipientOverride"] = true
		metaCopy["overrideRecipient"] = toEmail
		metaCopy["originalRecipient"] = originalTo
	}

	subject := buildOrderSubject(payload)
	toName := buildCustomerDisplayName(payload)

	var logRec *core.Record
	if rec, err := createEmailLog(s.app, e, originalTo, toName, subject, logCtx, metaCopy); err == nil {
		logRec = rec
	} else {
		fmt.Println("email log create failed:", err.Error())
	}

	occasionDate := formatDate(string(payload.Order.OccasionDate))
	ref := buildOrderReference(payload)
	recommendationFrames, _ := buildRecommendationEmailContentFromPayload(payload)

	emailHTML, err := renderEmailTemplate(
		s.viewsDir,
		"email.recommendation.html",
		buildRecommendationTemplateData(payload, occasionDate, ref, recommendationFrames, s.emailLogoDataURI),
	)
	if err != nil {
		updateEmailLog(s.app, logRec, "failed", err.Error(), map[string]any{"stage": "render_email_html"})
		return &recommendationEmailSendError{
			PublicMessage: "Failed to render recommendation email.",
			Cause:         err,
		}
	}

	textBody := buildRecommendationTextBody(payload, occasionDate, ref, recommendationFrames)
	req := ResendEmailRequest{
		To:      []string{toEmail},
		Subject: subject,
		HTML:    emailHTML,
		Text:    textBody,
	}

	idemKey := ""
	if logRec != nil && strings.TrimSpace(logRec.Id) != "" {
		idemKey = "email_log_" + logRec.Id
	}

	sendStart := time.Now()
	resp, sendErr := s.resend.SendEmail(ctx, req, idemKey)
	if sendErr != nil {
		metaPatch := map[string]any{
			"stage":  "send_email",
			"sendMs": time.Since(sendStart).Milliseconds(),
		}
		if httpErr, ok := sendErr.(*ResendHTTPError); ok {
			metaPatch["resendStatus"] = httpErr.Status
			metaPatch["resendBody"] = httpErr.Body
		}
		updateEmailLog(s.app, logRec, "failed", sendErr.Error(), metaPatch)

		return &recommendationEmailSendError{
			PublicMessage: "Failed to send recommendation email.",
			Cause:         sendErr,
		}
	}

	updateEmailLog(s.app, logRec, "sent", "", map[string]any{
		"stage":          "sent",
		"sendMs":         time.Since(sendStart).Milliseconds(),
		"resendId":       resp.ID,
		"idempotencyKey": idemKey,
		"toEmailActual":  toEmail,
	})

	return nil
}

func buildRecommendationTemplateData(
	payload invoicePayload,
	occasionDate string,
	ref string,
	recommendationFrames []recommendationEmailFrame,
	emailLogoDataURI string,
) map[string]any {
	return map[string]any{
		"logoDataURI": emailLogoDataURI,
		"customer": map[string]any{
			"title":   strings.TrimSpace(payload.Customer.Title),
			"surname": strings.TrimSpace(payload.Customer.Surname),
		},
		"order": map[string]any{
			"occasionDate": occasionDate,
			"ref":          ref,
		},
		"links": map[string]any{
			"jotform":     "https://eu.jotform.com/PPetals/order-form",
			"frameStyles": "https://www.preciouspetals.co.uk/framestyles",
			"terms":       "https://www.preciouspetals.co.uk/terms",
			"website":     "https://www.preciouspetals.co.uk",
		},
		"recommendation": map[string]any{
			"frames": recommendationFrames,
		},
		"suggestions": map[string]any{
			"sideProfileUpsizePrice": "£50.00",
		},
		"contact": map[string]any{
			"phone": "01256 882422",
			"email": "enquiries@preciouspetals.co.uk",
		},
		"brand": map[string]any{
			"name":    "Precious Petals",
			"tagline": "Flower Preservation Specialists",
			"phone":   "01256 882422",
			"website": "https://www.preciouspetals.co.uk",
		},
	}
}

func cloneMeta(meta map[string]any) map[string]any {
	if len(meta) == 0 {
		return map[string]any{}
	}

	cloned := make(map[string]any, len(meta))
	for key, value := range meta {
		cloned[key] = value
	}

	return cloned
}

func registerRecommendationFollowUpCron(app *pocketbase.PocketBase, service recommendationEmailService) error {
	location, err := time.LoadLocation(londonTimezoneName)
	if err != nil {
		return fmt.Errorf("load %s timezone: %w", londonTimezoneName, err)
	}

	cronExpr := strings.TrimSpace(os.Getenv(recommendationReminderCronEnv))
	if cronExpr == "" {
		cronExpr = recommendationReminderCronDefault
	}

	app.Cron().SetTimezone(location)
	app.Cron().Remove(recommendationReminderCronJobID)

	return app.Cron().Add(recommendationReminderCronJobID, cronExpr, func() {
		runRecommendationFollowUpCron(app, service, location, time.Now().In(location))
	})
}

func runRecommendationFollowUpCron(
	app *pocketbase.PocketBase,
	service recommendationEmailService,
	location *time.Location,
	now time.Time,
) {
	orders, err := fetchRecommendationReminderOrders(app)
	if err != nil {
		fmt.Println("recommendation reminder cron: failed to fetch orders:", err.Error())
		return
	}

	for _, order := range orders {
		if order == nil {
			continue
		}

		frameIDs := order.GetStringSlice("frameOrderId")
		if len(uniqueNonEmptyStrings(frameIDs)) == 0 {
			continue
		}

		customer, err := fetchCustomerByOrderId(app, order.Id)
		if err != nil {
			fmt.Println("recommendation reminder cron: skipping order without customer:", order.Id, err.Error())
			continue
		}

		state := recommendationReminderState{
			IsDeleted:     order.GetBool("isDeleted"),
			OrderStatus:   strings.TrimSpace(order.GetString("orderStatus")),
			PaymentStatus: strings.TrimSpace(order.GetString("payment_status")),
			FrameCount:    len(uniqueNonEmptyStrings(frameIDs)),
			CustomerEmail: strings.TrimSpace(customer.GetString("email")),
		}
		if !state.IsEligible() {
			continue
		}

		successLogs, err := fetchSuccessfulRecommendationEmailLogs(app, order.Id)
		if err != nil {
			fmt.Println("recommendation reminder cron: failed to fetch email logs:", order.Id, err.Error())
			continue
		}
		if len(successLogs) == 0 {
			continue
		}

		firstSuccessAt, ok := firstSuccessfulRecommendationSentAt(successLogs)
		if !ok {
			fmt.Println("recommendation reminder cron: skipping order with unreadable success timestamps:", order.Id)
			continue
		}

		if !isRecommendationReminderDue(now, firstSuccessAt, len(successLogs), location) {
			continue
		}

		frames, err := fetchOrderedFrameRecordsForOrder(app, order)
		if err != nil {
			fmt.Println("recommendation reminder cron: failed to fetch frame items:", order.Id, err.Error())
			continue
		}
		if len(frames) == 0 {
			continue
		}

		payload, err := buildRecommendationPayloadFromRecords(order, customer, frames)
		if err != nil {
			fmt.Println("recommendation reminder cron: failed to build payload:", order.Id, err.Error())
			continue
		}

		logCtx, meta := buildRecommendationFollowUpLogContext(order, customer, frames)
		if err := service.send(context.Background(), nil, payload, logCtx, meta); err != nil {
			fmt.Println("recommendation reminder cron:", recommendationEmailLogMessage(err), order.Id)
		}
	}
}

func fetchRecommendationReminderOrders(app *pocketbase.PocketBase) ([]*core.Record, error) {
	filter := `isDeleted = false && orderStatus = "to_choose"`
	return collectRecordsPageByPage(func(limit, offset int) ([]*core.Record, error) {
		return app.FindRecordsByFilter("orders", filter, "created", limit, offset)
	})
}

func fetchSuccessfulRecommendationEmailLogs(app *pocketbase.PocketBase, orderID string) ([]*core.Record, error) {
	filter := fmt.Sprintf(
		`orderId = "%s" && channel = "email" && status = "sent" && emailType = "recommendation_bouquet"`,
		escapeFilterValue(orderID),
	)

	return collectRecordsPageByPage(func(limit, offset int) ([]*core.Record, error) {
		return app.FindRecordsByFilter("email_logs", filter, "sentAt", limit, offset)
	})
}

func fetchOrderedFrameRecordsForOrder(app *pocketbase.PocketBase, order *core.Record) ([]*core.Record, error) {
	frameIDs := order.GetStringSlice("frameOrderId")
	uniqueIDs := uniqueNonEmptyStrings(frameIDs)
	if len(uniqueIDs) == 0 {
		return []*core.Record{}, nil
	}

	frameRecords, err := fetchRecordsByIds(app, "order_frame_items", uniqueIDs)
	if err != nil {
		return nil, err
	}

	framesByID := make(map[string]*core.Record, len(frameRecords))
	for _, frame := range frameRecords {
		if frame != nil {
			framesByID[frame.Id] = frame
		}
	}

	ordered := make([]*core.Record, 0, len(frameIDs))
	for _, frameID := range frameIDs {
		frameID = strings.TrimSpace(frameID)
		if frameID == "" {
			continue
		}
		if frame, ok := framesByID[frameID]; ok && frame != nil {
			ordered = append(ordered, frame)
		}
	}

	return ordered, nil
}

func buildRecommendationFollowUpLogContext(order, customer *core.Record, frames []*core.Record) (emailLogContext, map[string]any) {
	ctx := emailLogContext{
		EmailType:   "recommendation_bouquet",
		EventType:   "bouquet_recommendation_followup",
		TemplateKey: "email.recommendation",
		OrderId:     order.Id,
		CustomerId:  customer.Id,
	}
	if len(frames) == 1 && frames[0] != nil {
		ctx.FrameItemId = frames[0].Id
	}

	return ctx, map[string]any{
		"source": recommendationReminderSource,
	}
}

func buildRecommendationPayloadFromRecords(order, customer *core.Record, frames []*core.Record) (invoicePayload, error) {
	if order == nil {
		return invoicePayload{}, errors.New("missing order record")
	}
	if customer == nil {
		return invoicePayload{}, errors.New("missing customer record")
	}

	framePayloads := make([]map[string]any, 0, len(frames))
	for _, frame := range frames {
		if frame == nil {
			continue
		}

		extras := readExtrasMap(frame.Get("extras"))
		framePayloads = append(framePayloads, map[string]any{
			"size":             buildMeasuredFrameSize(frame, extras),
			"measuredSize":     buildMeasuredFrameSize(frame, extras),
			"recommendedSize":  buildRecommendedFrameSize(extras),
			"frameType":        strings.TrimSpace(frame.GetString("frameType")),
			"glassType":        strings.TrimSpace(frame.GetString("glassType")),
			"layout":           strings.TrimSpace(frame.GetString("layout")),
			"preservationType": strings.TrimSpace(frame.GetString("preservationType")),
			"inclusions":       strings.TrimSpace(frame.GetString("inclusions")),
			"specialNotes":     strings.TrimSpace(getStringFirst(frame, "specialNotes", "special_notes")),
			"mountColour":      strings.TrimSpace(getStringFirst(frame, "mountColour", "frameMountColour")),
			"glassEngraving":   strings.TrimSpace(frame.GetString("glassEngraving")),
			"price":            frame.GetFloat("price"),
			"extras": map[string]any{
				"framePrice":          extras["framePrice"],
				"mountPrice":          extras["mountPrice"],
				"glassPrice":          extras["glassPrice"],
				"glassEngravingPrice": extras["glassEngravingPrice"],
			},
		})
	}

	rawPayload := map[string]any{
		"customer": map[string]any{
			"id":          customer.Id,
			"title":       strings.TrimSpace(customer.GetString("title")),
			"firstName":   strings.TrimSpace(customer.GetString("firstName")),
			"surname":     strings.TrimSpace(customer.GetString("surname")),
			"email":       strings.TrimSpace(customer.GetString("email")),
			"displayName": buildCustomerDisplayNameFromRecords(customer),
		},
		"order": map[string]any{
			"orderId":      order.Id,
			"orderNo":      order.GetInt("orderNo"),
			"created":      strings.TrimSpace(order.GetString("created")),
			"occasionDate": strings.TrimSpace(order.GetString("occasionDate")),
			"requiredBy":   strings.TrimSpace(order.GetString("requiredBy")),
		},
		"frames": framePayloads,
	}

	data, err := json.Marshal(rawPayload)
	if err != nil {
		return invoicePayload{}, err
	}

	var payload invoicePayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return invoicePayload{}, err
	}

	return payload, nil
}

func buildCustomerDisplayNameFromRecords(customer *core.Record) string {
	parts := []string{
		strings.TrimSpace(customer.GetString("title")),
		strings.TrimSpace(customer.GetString("firstName")),
		strings.TrimSpace(customer.GetString("surname")),
	}
	return strings.TrimSpace(strings.Join(filterEmpty(parts), " "))
}

func buildRecommendedFrameSize(extras map[string]any) string {
	return buildFrameSizeFromExtras(extras["recommendedSizeWidthIn"], extras["recommendedSizeHeightIn"])
}

func buildMeasuredFrameSize(frame *core.Record, extras map[string]any) string {
	if measured := buildFrameSizeFromExtras(extras["measuredWidthIn"], extras["measuredHeightIn"]); measured != "" {
		return measured
	}

	sizeX := strings.TrimSpace(frame.GetString("sizeX"))
	sizeY := strings.TrimSpace(frame.GetString("sizeY"))
	if sizeX == "" || sizeY == "" {
		return ""
	}

	return fmt.Sprintf("%s x %s inches", sizeX, sizeY)
}

func buildFrameSizeFromExtras(widthValue, heightValue any) string {
	width, widthOK := coerceFloat(widthValue)
	height, heightOK := coerceFloat(heightValue)
	if !widthOK || !heightOK || width <= 0 || height <= 0 {
		return ""
	}

	return fmt.Sprintf("%s x %s inches", fmtNumberNoTrailingZero(width), fmtNumberNoTrailingZero(height))
}

func firstSuccessfulRecommendationSentAt(logs []*core.Record) (time.Time, bool) {
	var earliest time.Time
	found := false

	for _, log := range logs {
		if log == nil {
			continue
		}

		sentAt, ok := parseDateTime(getStringFirst(log, "sentAt", "created"))
		if !ok {
			continue
		}

		if !found || sentAt.Before(earliest) {
			earliest = sentAt
			found = true
		}
	}

	return earliest, found
}

func (s recommendationReminderState) IsEligible() bool {
	if s.IsDeleted {
		return false
	}
	if strings.TrimSpace(s.OrderStatus) != "to_choose" {
		return false
	}
	if s.FrameCount <= 0 {
		return false
	}
	if strings.TrimSpace(s.CustomerEmail) == "" {
		return false
	}

	switch strings.TrimSpace(s.PaymentStatus) {
	case "second_deposit_paid", "waiting_final_balance", "final_balance_paid":
		return false
	default:
		return true
	}
}

func recommendationExpectedSuccessCount(now, firstSuccessAt time.Time, location *time.Location) int {
	if firstSuccessAt.IsZero() {
		return 0
	}
	if location == nil {
		location = time.UTC
	}

	firstDay := recommendationDayBoundary(firstSuccessAt, location)
	nowDay := recommendationDayBoundary(now, location)
	if nowDay.Before(firstDay) {
		return 1
	}

	daysSinceFirst := int(nowDay.Sub(firstDay).Hours() / 24)
	return 1 + (daysSinceFirst / recommendationReminderInterval)
}

func isRecommendationReminderDue(now, firstSuccessAt time.Time, actualSuccessCount int, location *time.Location) bool {
	if actualSuccessCount <= 0 || firstSuccessAt.IsZero() {
		return false
	}

	expectedSuccessCount := recommendationExpectedSuccessCount(now, firstSuccessAt, location)
	if expectedSuccessCount == 0 {
		return false
	}

	return actualSuccessCount < expectedSuccessCount
}

func recommendationDayBoundary(value time.Time, location *time.Location) time.Time {
	local := value.In(location)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
}

func recommendationEmailLogMessage(err error) string {
	var sendErr *recommendationEmailSendError
	if errors.As(err, &sendErr) && sendErr != nil {
		return fmt.Sprintf("%s %s", sendErr.PublicMessage, sendErr.Cause.Error())
	}
	return err.Error()
}
