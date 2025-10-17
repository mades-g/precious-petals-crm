/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3039693317")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_R2fxxqHXZw` ON `mounts` (`colour`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3039693317")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
