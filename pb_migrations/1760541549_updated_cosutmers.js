/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_930082924")

  // update collection data
  unmarshal({
    "name": "costumers"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_930082924")

  // update collection data
  unmarshal({
    "name": "cosutmers"
  }, collection)

  return app.save(collection)
})
