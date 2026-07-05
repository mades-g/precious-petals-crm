package main

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

type adminUserView struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type updateMemberPasswordPayload struct {
	UserId          string `json:"userId"`
	Password        string `json:"password"`
	PasswordConfirm string `json:"passwordConfirm"`
}

func registerAdminRoutes(se *core.ServeEvent, app *pocketbase.PocketBase) {
	se.Router.GET("/api/admin/users", func(e *core.RequestEvent) error {
		if err := requireAdmin(e); err != nil {
			return err
		}

		records, err := app.FindRecordsByFilter("users", "", "name,email", 500, 0)
		if err != nil {
			return e.JSON(http.StatusInternalServerError, map[string]any{
				"ok":    false,
				"error": "Failed to load users.",
			})
		}

		users := make([]adminUserView, 0, len(records))
		for _, record := range records {
			if isAdminUser(record) {
				continue
			}

			users = append(users, adminUserView{
				Id:    record.Id,
				Name:  record.GetString("name"),
				Email: record.Email(),
				Role:  memberRoleLabel(record),
			})
		}

		return e.JSON(http.StatusOK, map[string]any{
			"ok":    true,
			"users": users,
		})
	}).Bind(apis.RequireAuth())

	se.Router.POST("/api/admin/users/password", func(e *core.RequestEvent) error {
		if err := requireAdmin(e); err != nil {
			return err
		}

		var payload updateMemberPasswordPayload
		if err := bindPayload(e, &payload); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Invalid payload.",
				"details": err.Error(),
			})
		}

		userId := strings.TrimSpace(payload.UserId)
		if userId == "" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Choose a member.",
			})
		}
		if payload.Password != payload.PasswordConfirm {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Passwords do not match.",
			})
		}
		if utf8.RuneCountInString(payload.Password) < 8 {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "Password must be at least 8 characters.",
			})
		}

		record, err := app.FindRecordById("users", userId)
		if err != nil {
			return e.JSON(http.StatusNotFound, map[string]any{
				"ok":    false,
				"error": "Member not found.",
			})
		}
		if isAdminUser(record) {
			return e.JSON(http.StatusForbidden, map[string]any{
				"ok":    false,
				"error": "Admin passwords cannot be changed from this page.",
			})
		}

		record.SetPassword(payload.Password)
		if err := app.Save(record); err != nil {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"ok":      false,
				"error":   "Failed to update password.",
				"details": err.Error(),
			})
		}

		return e.JSON(http.StatusOK, map[string]any{
			"ok": true,
			"user": adminUserView{
				Id:    record.Id,
				Name:  record.GetString("name"),
				Email: record.Email(),
				Role:  memberRoleLabel(record),
			},
		})
	}).Bind(apis.RequireAuth())
}

func requireAdmin(e *core.RequestEvent) error {
	if e.Auth == nil {
		return e.JSON(http.StatusUnauthorized, map[string]any{
			"ok":    false,
			"error": "Authentication required.",
		})
	}
	if !isAdminUser(e.Auth) {
		return e.JSON(http.StatusForbidden, map[string]any{
			"ok":    false,
			"error": "Admin access required.",
		})
	}

	return nil
}

func isAdminUser(record *core.Record) bool {
	return record != nil && record.GetString("role") == "admin"
}

func memberRoleLabel(record *core.Record) string {
	role := record.GetString("role")
	if role == "" {
		return "member"
	}
	return role
}
