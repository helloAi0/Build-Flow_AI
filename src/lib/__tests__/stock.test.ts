import { describe, it, expect } from "vitest";
import * as rel from "@/lib/appRelations";
import { stockEffects, applyStockChanges } from "@/lib/runtime.functions";

function fakeDb(rows: any[]) {
  return {
    rows,
    from() {
      const q: any = {
        select: () => q, eq: () => q,
        in: async () => ({ data: rows }),
        update: (d: any) => ({ eq: async (_: string, id: string) => { rows.find((r) => r.id === id).data = d.data; return { error: null }; } }),
      };
      return q;
    },
  };
}

describe("stock workflow", () => {
  it("order reduces stock, delete restores it", async () => {
    const db = fakeDb([{ id: "p1", kind: "products", data: { name: "Tee", stock: 10 } }]);
    const eff = stockEffects("orders", { product: "Tee", quantity: 3 }, rel)[0];
    expect(eff).toEqual({ item: "Tee", delta: -3 });
    await applyStockChanges(db, "x", [eff], rel);
    expect(db.rows[0].data.stock).toBe(7);
    await applyStockChanges(db, "x", [{ item: eff.item, delta: -eff.delta }], rel);
    expect(db.rows[0].data.stock).toBe(10);
  });
  it("cancelled orders have no stock effect", () => {
    expect(stockEffects("orders", { product: "Tee", quantity: 3, status: "Cancelled" }, rel)).toEqual([]);
  });
  it("an inventory entry never adjusts itself", async () => {
    const db = fakeDb([{ id: "i1", kind: "inventory", data: { product: "Tee", quantity: 5 } }]);
    const eff = stockEffects("inventory", db.rows[0].data, rel)[0];
    await applyStockChanges(db, "x", [eff], rel, "i1");
    expect(db.rows[0].data.quantity).toBe(5);
  });
});

describe("stock target", () => {
  it("adjusts the inventory entry, not a product without a stock count", async () => {
    const db = fakeDb([
      { id: "p1", kind: "products", data: { name: "AirPods", price: 249 } },
      { id: "i1", kind: "inventory", data: { name: "AirPods", stock: 25 } },
    ]);
    await applyStockChanges(db, "x", [{ item: "AirPods", delta: -2 }], rel);
    expect(db.rows[1].data.stock).toBe(23);
    expect(db.rows[0].data.stock).toBeUndefined();
  });
});

describe("multi-item orders", () => {
  it("an order listing several items yields one stock effect per item", () => {
    const effs = stockEffects("orders", { items: "iPhone 15 (1), 30W Fast Charger USB-C (2)" }, rel);
    expect(effs).toEqual([
      { item: "iPhone 15", delta: -1 },
      { item: "30W Fast Charger USB-C", delta: -2 },
    ]);
  });
  it("each item reduces its own product's stock", async () => {
    const db = fakeDb([
      { id: "p1", kind: "products", data: { name: "iPhone 15", stock: 5 } },
      { id: "p2", kind: "products", data: { name: "30W Fast Charger USB-C", stock: 8 } },
    ]);
    const effs = stockEffects("orders", { items: "iPhone 15 (1), 30W Fast Charger USB-C (2)" }, rel);
    await applyStockChanges(db, "x", effs, rel);
    expect(db.rows[0].data.stock).toBe(4);
    expect(db.rows[1].data.stock).toBe(6);
  });
  it("deleting a multi-item order restocks every item", async () => {
    const db = fakeDb([
      { id: "p1", kind: "products", data: { name: "iPhone 15", stock: 4 } },
      { id: "p2", kind: "products", data: { name: "30W Fast Charger USB-C", stock: 6 } },
    ]);
    const effs = stockEffects("orders", { items: "iPhone 15 (1), 30W Fast Charger USB-C (2)" }, rel);
    await applyStockChanges(db, "x", effs.map((e) => ({ item: e.item, delta: -e.delta })), rel);
    expect(db.rows[0].data.stock).toBe(5);
    expect(db.rows[1].data.stock).toBe(8);
  });
  it("items without a matching product are skipped", async () => {
    const db = fakeDb([{ id: "p1", kind: "products", data: { name: "iPhone 15", stock: 5 } }]);
    const effs = stockEffects("orders", { items: "iPhone 15 (1), Mystery Item (3)" }, rel);
    await applyStockChanges(db, "x", effs, rel);
    expect(db.rows[0].data.stock).toBe(4);
  });
  it("a purchase listing several items restocks each item", async () => {
    const effs = stockEffects("purchases", { items: "iPhone 15 (3), Case (4)" }, rel);
    expect(effs).toEqual([
      { item: "iPhone 15", delta: 3 },
      { item: "Case", delta: 4 },
    ]);
  });
});

import { parseItemText, referencedItems as refItems, quantityOf as qtyOf } from "@/lib/appRelations";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("free-text order items", () => {
  i2("reads name and quantity from 'Name (2)'", () => {
    e2(parseItemText("AirPods Pro (2nd Gen) (2)")).toEqual({ name: "AirPods Pro (2nd Gen)", qty: 2 });
  });
  i2("an order with a single items line links to that product", () => {
    const o = { items: "3x 30W Fast Charger USB-C" };
    e2(refItems(o)).toEqual([{ name: "30W Fast Charger USB-C", qty: 3 }]);
    e2(qtyOf(o)).toBe(3);
  });
  i2("a comma-separated items line links every entry", () => {
    e2(refItems({ items: "iPhone 15, Case" })).toEqual([
      { name: "iPhone 15", qty: 1 },
      { name: "Case", qty: 1 },
    ]);
  });
  i2("a linked product field uses the record's quantity", () => {
    e2(refItems({ product: "Tee", quantity: 3 })).toEqual([{ name: "Tee", qty: 3 }]);
  });
});
