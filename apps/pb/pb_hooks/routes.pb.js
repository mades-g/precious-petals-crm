/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/email/recommendation", (e) => {
  const body = e.requestInfo().body;
  return e.json(200, { ok: true, data: body });
});

routerAdd("POST", "/api/email/invoice", (e) => {
  const body = e.requestInfo().body;
  return e.json(200, { ok: true, data: body });
});
