package pb_migrations

import (
	"errors"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

var removedFrameTypeOptions = []string{
	"Speckled gold",
	"Speckled silver",
}

var customerTitleSelectOptions = []string{
	"Mrs",
	"Ms",
	"Mr",
	"Miss",
}

func init() {
	m.Register(func(app core.App) error {
		if err := updateCustomerTitleTextField(app, false); err != nil {
			return err
		}
		if err := addSelectOptions(app, "customers", "howRecommended", []string{"Previous customer"}); err != nil {
			return err
		}
		return removeSelectOptions(app, "order_frame_items", "frameType", removedFrameTypeOptions)
	}, func(app core.App) error {
		if err := updateCustomerTitleSelectField(app, true); err != nil {
			return err
		}
		if err := removeSelectOptions(app, "customers", "howRecommended", []string{"Previous customer"}); err != nil {
			return err
		}
		return addSelectOptions(app, "order_frame_items", "frameType", removedFrameTypeOptions)
	})
}

func updateCustomerTitleTextField(app core.App, required bool) error {
	collection, err := app.FindCollectionByNameOrId("customers")
	if err != nil {
		return err
	}

	if textField, ok := collection.Fields.GetByName("title").(*core.TextField); ok {
		textField.Required = required
		textField.Max = 80
		return app.Save(collection)
	}

	titleValues, err := collectCustomerTitleValues(app)
	if err != nil {
		return err
	}

	titleField := &core.TextField{
		Name:     "title",
		Required: required,
		Max:      80,
	}

	collection.Fields.RemoveByName("title")
	collection.Fields.Add(titleField)
	if err := app.Save(collection); err != nil {
		return err
	}

	return restoreCustomerTitleValues(app, titleValues)
}

func updateCustomerTitleSelectField(app core.App, required bool) error {
	collection, err := app.FindCollectionByNameOrId("customers")
	if err != nil {
		return err
	}

	titleValues, err := collectCustomerTitleValues(app)
	if err != nil {
		return err
	}

	selectValues := append([]string{}, customerTitleSelectOptions...)
	for _, title := range titleValues {
		if title != "" && !selectOptionIncludes(selectValues, title) {
			selectValues = append(selectValues, title)
		}
	}

	if selectField, ok := collection.Fields.GetByName("title").(*core.SelectField); ok {
		selectField.Required = required
		selectField.Values = selectValues
		if err := app.Save(collection); err != nil {
			return err
		}
		return restoreCustomerTitleValues(app, titleValues)
	}

	titleField := &core.SelectField{
		Name:     "title",
		Values:   selectValues,
		Required: required,
	}

	collection.Fields.RemoveByName("title")
	collection.Fields.Add(titleField)
	if err := app.Save(collection); err != nil {
		return err
	}

	return restoreCustomerTitleValues(app, titleValues)
}

func collectCustomerTitleValues(app core.App) (map[string]string, error) {
	records, err := app.FindAllRecords("customers")
	if err != nil {
		return nil, err
	}

	values := make(map[string]string, len(records))
	for _, record := range records {
		values[record.Id] = record.GetString("title")
	}

	return values, nil
}

func restoreCustomerTitleValues(app core.App, values map[string]string) error {
	records, err := app.FindAllRecords("customers")
	if err != nil {
		return err
	}

	for _, record := range records {
		title, ok := values[record.Id]
		if !ok {
			continue
		}
		record.Set("title", title)
		if err := app.Save(record); err != nil {
			return err
		}
	}

	return nil
}

func addSelectOptions(app core.App, collectionName string, fieldName string, options []string) error {
	selectField, collection, err := findSelectField(app, collectionName, fieldName)
	if err != nil {
		return err
	}

	updated := false
	for _, option := range options {
		if !selectOptionIncludes(selectField.Values, option) {
			selectField.Values = append(selectField.Values, option)
			updated = true
		}
	}

	if !updated {
		return nil
	}

	return app.Save(collection)
}

func removeSelectOptions(app core.App, collectionName string, fieldName string, options []string) error {
	selectField, collection, err := findSelectField(app, collectionName, fieldName)
	if err != nil {
		return err
	}

	filtered := make([]string, 0, len(selectField.Values))
	for _, value := range selectField.Values {
		if selectOptionIncludes(options, value) {
			continue
		}
		filtered = append(filtered, value)
	}

	if len(filtered) == len(selectField.Values) {
		return nil
	}

	selectField.Values = filtered
	return app.Save(collection)
}

func findSelectField(app core.App, collectionName string, fieldName string) (*core.SelectField, *core.Collection, error) {
	collection, err := app.FindCollectionByNameOrId(collectionName)
	if err != nil {
		return nil, nil, err
	}

	field := collection.Fields.GetByName(fieldName)
	selectField, ok := field.(*core.SelectField)
	if !ok {
		return nil, nil, errors.New(fieldName + " field is not a select field")
	}

	return selectField, collection, nil
}

func selectOptionIncludes(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
