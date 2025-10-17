/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3039693317")

  // remove field
  collection.fields.removeById("select4210582990")

  // remove field
  collection.fields.removeById("text3422445526")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4210582990",
    "max": 0,
    "min": 0,
    "name": "colour",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3039693317")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "select4210582990",
    "maxSelect": 1,
    "name": "colour",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "cream – 8674",
      "red – 8020",
      "burgundy – 8151",
      "gold – 8246",
      "sage - 8633",
      "silver – 8358",
      "blue – 8168",
      "purple – 8146",
      "navy – 8687",
      "pink – 8064",
      "maroon - 8016",
      "light grey – 8664",
      "bright white - 8977",
      "other"
    ]
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3422445526",
    "max": 0,
    "min": 0,
    "name": "other_colour",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("text4210582990")

  return app.save(collection)
})
