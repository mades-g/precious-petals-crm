/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3243444857")

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "select375251012",
    "maxSelect": 1,
    "name": "preservation_tyoe",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "3D",
      "pressed"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3243444857")

  // remove field
  collection.fields.removeById("select375251012")

  return app.save(collection)
})
