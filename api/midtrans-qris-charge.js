import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    await initDb();

    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
    if (!MIDTRANS_SERVER_KEY) return res.status(500).json({ error: "MIDTRANS_SERVER_KEY missing" });

    const isProd = (process.env.MIDTRANS_IS_PROD || "false") === "true";
    const base = isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

    const { rows } = await sql`SELECT * FROM orders WHERE id=${orderId} LIMIT 1`;
    const order = rows[0];
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.provider !== "midtrans_qris") return res.status(400).json({ error: "Provider mismatch" });

    const auth = `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString("base64")}`;

    const publicBase =
      process.env.PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    const payload = {
      payment_type: "qris",
      transaction_details: { order_id: orderId, gross_amount: Number(order.amount_idr) },
      qris: { acquirer: "gopay" }
    };

    const r = await fetch(`${base}/v2/charge`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": auth,
        ...(publicBase ? { "X-Override-Notification": `${publicBase}/api/midtrans-notify` } : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data });

    const qrAction = Array.isArray(data.actions)
      ? data.actions.find(a => a.name === "generate-qr-code" && a.url)
      : null;

    await sql`
      UPDATE orders
      SET status=${data.transaction_status || "pending"},
          provider_ref=${data.transaction_id || null},
          provider_payload_json=${JSON.stringify(data)}::jsonb,
          updated_at=NOW()
      WHERE id=${orderId}
    `;

    res.json({
      orderId,
      transaction_status: data.transaction_status,
      qrImageUrl: qrAction?.url || null,
      qr_string: data.qr_string || null
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "QRIS charge error" });
  }
}
