import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    await initDb();

    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const key = process.env.REVOLUT_API_KEY;
    if (!key) return res.status(500).json({ error: "Revolut env missing" });

    const base = process.env.REVOLUT_BASE_URL || "https://merchant.revolut.com";
    const ver = process.env.REVOLUT_API_VERSION || "2025-12-04";

    const { rows } = await sql`SELECT * FROM orders WHERE id=${orderId} LIMIT 1`;
    const order = rows[0];
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.provider !== "revolut") return res.status(400).json({ error: "Provider mismatch" });

    const amountMinor = Math.max(1, Math.round(Number(order.amount_usd) * 100));

    const r = await fetch(`${base}/api/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${key}`,
        "Revolut-Api-Version": ver
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: "USD",
        merchant_order_ext_ref: orderId
      })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data });

    await sql`
      UPDATE orders SET status=${"revolut_created"}, provider_ref=${data.id || null},
      provider_payload_json=${JSON.stringify(data)}::jsonb, updated_at=NOW()
      WHERE id=${orderId}
    `;

    res.json({ checkout_url: data.checkout_url });
  } catch (e) {
    res.status(500).json({ error: e.message || "Revolut error" });
  }
}
