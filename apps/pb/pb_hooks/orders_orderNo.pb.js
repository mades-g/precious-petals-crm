/// <reference path="../pb_data/types.d.ts" />

console.log("orders_orderNo conditional hook loaded");

onRecordCreate((e) => {
  if (e.record.collection().name !== "orders") return e.next();

  const current = e.record.get("orderNo");

  // If orderNo already set (eg manual first order), respect it
  if (typeof current === "number" && current > 0) {
    return e.next();
  }

  // Otherwise, compute next order number
  const latest = $app.findRecordsByFilter(
    "orders",
    "orderNo != null",
    "-orderNo",
    1,
    0,
  );

  const lastNo = latest.length > 0 ? Number(latest[0].get("orderNo")) || 0 : 0;

  e.record.set("orderNo", lastNo + 1);

  return e.next();
}, "orders");
