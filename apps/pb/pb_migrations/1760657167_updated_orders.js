/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3527180448")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "bool3190627549",
    "name": "artwork_complete",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3294824926",
    "hidden": false,
    "id": "relation2351082010",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "layout_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1743856956",
    "hidden": false,
    "id": "relation1850344938",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "glass_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3527180448")

  // remove field
  collection.fields.removeById("bool3190627549")

  // remove field
  collection.fields.removeById("relation2351082010")

  // remove field
  collection.fields.removeById("relation1850344938")

  return app.save(collection)
})
