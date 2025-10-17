/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3243444857")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "select724990059",
    "maxSelect": 1,
    "name": "title",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "mr",
      "mrs",
      "miss"
    ]
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3883309839",
    "max": 0,
    "min": 0,
    "name": "surname",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2849095986",
    "max": 0,
    "min": 0,
    "name": "first_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "exceptDomains": [],
    "hidden": false,
    "id": "email3885137012",
    "name": "email",
    "onlyDomains": [],
    "presentable": false,
    "required": true,
    "system": false,
    "type": "email"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1158672400",
    "max": 0,
    "min": 0,
    "name": "telephone",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text223244161",
    "max": 0,
    "min": 0,
    "name": "address",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "select1028339070",
    "maxSelect": 1,
    "name": "how_recommended",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "google",
      "friend / family",
      "florist",
      "wedding planner"
    ]
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "date4131114684",
    "max": "",
    "min": "",
    "name": "occasion_date",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "date2524971",
    "max": "",
    "min": "",
    "name": "prevservation_date",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text122736735",
    "max": 0,
    "min": 0,
    "name": "delivery_address",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3243444857")

  // remove field
  collection.fields.removeById("select724990059")

  // remove field
  collection.fields.removeById("text3883309839")

  // remove field
  collection.fields.removeById("text2849095986")

  // remove field
  collection.fields.removeById("email3885137012")

  // remove field
  collection.fields.removeById("text1158672400")

  // remove field
  collection.fields.removeById("text223244161")

  // remove field
  collection.fields.removeById("select1028339070")

  // remove field
  collection.fields.removeById("date4131114684")

  // remove field
  collection.fields.removeById("date2524971")

  // remove field
  collection.fields.removeById("text122736735")

  return app.save(collection)
})
