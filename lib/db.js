import { sql } from "@vercel/postgres";

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_idr INTEGER NOT NULL,
      amount_usd NUMERIC NOT NULL,
      customer_name TEXT,
      customer_email TEXT,
      discord_invite TEXT NOT NULL,
      items_json JSONB NOT NULL,
      provider_ref TEXT,
      provider_payload_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}
