/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_930082924")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1579384326",
    "max": 0,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "exceptDomains": null,
    "hidden": false,
    "id": "email3885137012",
    "name": "email",
    "onlyDomains": null,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select724990059",
    "maxSelect": 1,
    "name": "title",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "mrs",
      "miss",
      "ms"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_930082924")

  // remove field
  collection.fields.removeById("text1579384326")

  // remove field
  collection.fields.removeById("email3885137012")

  // remove field
  collection.fields.removeById("select724990059")

  return app.save(collection)
})
