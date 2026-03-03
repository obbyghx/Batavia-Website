import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";
import paypal from "@paypal/paypal-server-sdk";

function paypalClient() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal env missing");

  const env = (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
    ? new paypal.Environment.Live(id, secret)
    : new paypal.Environment.Sandbox(id, secret);

  return new paypal.Client(env);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    await initDb();

    const { orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const { rows } = await sql`SELECT * FROM orders WHERE id=${orderId} LIMIT 1`;
    const order = rows[0];
    if (!order?.provider_ref) return res.status(400).json({ error: "Missing PayPal order ref" });

    const client = paypalClient();
    const request = new paypal.orders.OrdersCaptureRequest(order.provider_ref);
    request.requestBody({});

    const response = await client.execute(request);
    const status = response.result.status || "UNKNOWN";
    const paid = status === "COMPLETED";

    await sql`
      UPDATE orders SET status=${paid ? "paid" : `paypal_${status.toLowerCase()}`},
      provider_payload_json=${JSON.stringify(response.result)}::jsonb,
      updated_at=NOW()
      WHERE id=${orderId}
    `;

    res.json({ paid, status });
  } catch (e) {
    res.status(500).json({ error: e.message || "PayPal capture error" });
  }
}
