/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1743856956")

  // remove field
  collection.fields.removeById("select2363381545")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1743856956")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "select2363381545",
    "maxSelect": 1,
    "name": "type",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "clearview uv glass",
      "conservation glass"
    ]
  }))

  return app.save(collection)
})
