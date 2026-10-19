package pb_migrations

import (
	"testing"

	"github.com/pocketbase/pocketbase/core"
)

func TestOrdersMountCutMigration(t *testing.T) {
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = app.ResetBootstrapState() })

	orders := core.NewBaseCollection("orders")
	orders.Fields.Add(&core.BoolField{Name: "artworkComplete"})
	orders.Fields.Add(&core.TextField{Name: "notes"})
	if err := app.Save(orders); err != nil {
		t.Fatal(err)
	}
	order := core.NewRecord(orders)
	order.Set("artworkComplete", true)
	order.Set("notes", "Keep the original ribbon")
	if err := app.Save(order); err != nil {
		t.Fatal(err)
	}

	var migration *core.Migration
	for _, candidate := range core.AppMigrations.Items() {
		if candidate.File == "20261010120000_add_orders_mount_cut.go" {
			migration = candidate
			break
		}
	}
	if migration == nil {
		t.Fatal("mount cut migration is not registered")
	}
	if err := migration.Up(app); err != nil {
		t.Fatal(err)
	}

	assertOrder := func(wantMountCut bool) *core.Record {
		t.Helper()
		reloaded, err := app.FindRecordById("orders", order.Id)
		if err != nil {
			t.Fatal(err)
		}
		if got := reloaded.GetBool("mountCut"); got != wantMountCut {
			t.Fatalf("mountCut: want %v, got %v", wantMountCut, got)
		}
		if !reloaded.GetBool("artworkComplete") || reloaded.GetString("notes") != "Keep the original ribbon" {
			t.Fatal("migration changed existing order fields")
		}
		return reloaded
	}
	order = assertOrder(false) // Existing orders start with an unchecked mount cut.
	if _, ok := order.Collection().Fields.GetByName("mountCut").(*core.BoolField); !ok {
		t.Fatal("mountCut must be a boolean field")
	}
	for _, value := range []bool{true, false} {
		order.Set("mountCut", value)
		if err := app.Save(order); err != nil {
			t.Fatal(err)
		}
		if err := migration.Up(app); err != nil {
			t.Fatal(err)
		}
		order = assertOrder(value) // Reapplying the migration preserves saved values.
	}

	if err := migration.Down(app); err != nil {
		t.Fatal(err)
	}
	order = assertOrder(false)
	if order.Collection().Fields.GetByName("mountCut") != nil {
		t.Fatal("rollback did not remove mountCut")
	}
}
