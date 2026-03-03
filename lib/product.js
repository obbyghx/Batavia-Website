export const PRODUCTS = [
  { id:"sb1-2x",  name:"2x Boost — 1 Bulan",  category:"Server Boost 1 Bulan", price_idr:25000 },
  { id:"sb1-6x",  name:"6x Boost — 1 Bulan",  category:"Server Boost 1 Bulan", price_idr:50000 },
  { id:"sb1-10x", name:"10x Boost — 1 Bulan", category:"Server Boost 1 Bulan", price_idr:75000 },
  { id:"sb1-14x", name:"14x Boost — 1 Bulan", category:"Server Boost 1 Bulan", price_idr:85000 },
  { id:"sb3-2x",  name:"2x Boost — 3 Bulan",  category:"Server Boost 3 Bulan", price_idr:35000 },
  { id:"sb3-6x",  name:"6x Boost — 3 Bulan",  category:"Server Boost 3 Bulan", price_idr:95000 },
  { id:"sb3-10x", name:"10x Boost — 3 Bulan", category:"Server Boost 3 Bulan", price_idr:170000 },
  { id:"sb3-14x", name:"14x Boost — 3 Bulan", category:"Server Boost 3 Bulan", price_idr:210000 }
];

export function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Empty cart");

  const out = [];
  for (const it of items) {
    const p = PRODUCTS.find(x => x.id === it.id);
    if (!p) throw new Error(`Invalid item: ${it.id}`);
    const qty = Math.max(1, Math.round(Number(it.qty || 1)));
    out.push({ id: p.id, name: p.name, category: p.category, price_idr: p.price_idr, qty });
  }
  return out;
}

export function sumIDR(items) {
  return items.reduce((s, it) => s + it.price_idr * it.qty, 0);
}
