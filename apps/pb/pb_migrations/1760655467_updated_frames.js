/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3380474996")

  // remove field
  collection.fields.removeById("select2363381545")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "bool1639016958",
    "name": "archived",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(2, new Field({
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3380474996")

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
      "black",
      "dark wood gold line",
      "oak",
      "beech",
      "cottage pine",
      "bronze",
      "antique gold",
      "speckled gold",
      "antique silver",
      "speckled silver",
      "new modern silver",
      "distressed white",
      "modern white",
      "distressed white wide",
      "pewter",
      "new pewter gunmetal",
      "flat white",
      "brushed silver",
      "stone gold",
      "stone silver",
      "other"
    ]
  }))

  // remove field
  collection.fields.removeById("bool1639016958")

  // remove field
  collection.fields.removeById("text1579384326")

  return app.save(collection)
})
