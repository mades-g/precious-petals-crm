/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3527180448")

  // add field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3243444857",
    "hidden": false,
    "id": "relation1622610258",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "costumer_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_4092854851",
    "hidden": false,
    "id": "relation1166304858",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "product_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3294824926",
    "hidden": false,
    "id": "relation2351082010",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "layout_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1743856956",
    "hidden": false,
    "id": "relation1850344938",
    "maxSelect": 999,
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
  collection.fields.removeById("relation1622610258")

  // remove field
  collection.fields.removeById("relation1166304858")

  // update field
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

  // update field
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
})
