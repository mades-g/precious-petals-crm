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
      },
      {
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
    "id": "pbc_3039693317",
    "indexes": [],
    "listRule": null,
    "name": "mounts",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3039693317");

  return app.delete(collection);
})
