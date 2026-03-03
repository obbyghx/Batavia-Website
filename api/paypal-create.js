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
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.provider !== "paypal") return res.status(400).json({ error: "Provider mismatch" });

    const client = paypalClient();
    const request = new paypal.orders.OrdersCreateRequest();
    request.headers["prefer"] = "return=representation";
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        { reference_id: orderId, amount: { currency_code: "USD", value: Number(order.amount_usd).toFixed(2) } }
      ]
    });

    const response = await client.execute(request);
    const ppId = response.result.id;

    await sql`
      UPDATE orders SET status=${"paypal_created"}, provider_ref=${ppId},
      provider_payload_json=${JSON.stringify(response.result)}::jsonb,
      updated_at=NOW()
      WHERE id=${orderId}
    `;

    res.json({ paypalOrderId: ppId });
  } catch (e) {
    res.status(500).json({ error: e.message || "PayPal create error" });
  }
}
