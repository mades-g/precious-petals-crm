/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3380474996")

  // update field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "bool1639016958",
    "name": "archived",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3380474996")

  // update field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "bool1639016958",
    "name": "archived",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
