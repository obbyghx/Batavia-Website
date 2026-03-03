import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    await initDb();

    const orderId = req.query.orderId;
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!MIDTRANS_SERVER_KEY) return res.status(500).json({ error: "MIDTRANS_SERVER_KEY missing" });

    const isProd = (process.env.MIDTRANS_IS_PROD || "false") === "true";
    const base = isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

    const auth = `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`;

    const r = await fetch(`${base}/v2/${encodeURIComponent(orderId)}/status`, {
      headers: { "accept": "application/json", "authorization": auth }
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data });

    await sql`
      UPDATE orders SET status=${data.transaction_status || "unknown"},
      provider_payload_json=${JSON.stringify(data)}::jsonb,
      updated_at=NOW()
      WHERE id=${orderId}
    `;

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || "Status error" });
  }
}
