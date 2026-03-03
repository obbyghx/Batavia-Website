import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    await initDb();

    const body = req.body || {};
    const orderId = body.order_id;

    if (orderId) {
      await sql`
        UPDATE orders
        SET status=${body.transaction_status || "unknown"},
            provider_payload_json=${JSON.stringify(body)}::jsonb,
            updated_at=NOW()
        WHERE id=${orderId}
      `;
    }

    res.status(200).json({ received: true });
  } catch {
    res.status(200).json({ received: true });
  }
}
