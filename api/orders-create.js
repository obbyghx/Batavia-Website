import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";
import { normalizeItems, sumIDR } from "../lib/products.js";
import { ensureDiscordInvite, orderId } from "../lib/validation.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    await initDb();

    const FX = Number(process.env.FX_USD_TO_IDR || 16855.54);

    const { provider, items, customer_name, customer_email, discord_invite } = req.body || {};
    if (!["midtrans_qris", "paypal", "revolut"].includes(provider)) {
      return res.status(400).json({ error: "Invalid provider" });
    }

    const normItems = normalizeItems(items);
    const amount_idr = sumIDR(normItems);
    const amount_usd = Number((amount_idr / FX).toFixed(2));
    const invite = ensureDiscordInvite(discord_invite);

    const id = orderId();

    await sql`
      INSERT INTO orders
        (id, provider, status, amount_idr, amount_usd, customer_name, customer_email, discord_invite, items_json)
      VALUES
        (${id}, ${provider}, ${"created"}, ${amount_idr}, ${amount_usd},
         ${String(customer_name||"").slice(0,100)}, ${String(customer_email||"").slice(0,140)},
         ${invite.slice(0,240)}, ${JSON.stringify(normItems)}::jsonb)
    `;

    res.json({ orderId: id, amount_idr, amount_usd });
  } catch (e) {
  console.error("ORDER CREATE ERROR:", e);
  res.status(400).json({ error: e.message || "Create order error" });
}
}
