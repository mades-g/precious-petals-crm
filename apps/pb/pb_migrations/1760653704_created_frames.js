/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
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
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1389359381",
        "max": 0,
        "min": 0,
        "name": "other_text",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3380474996",
    "indexes": [],
    "listRule": null,
    "name": "frames",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3380474996");

  return app.delete(collection);
})
