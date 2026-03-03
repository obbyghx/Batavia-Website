import { sql } from "@vercel/postgres";
import { initDb } from "../lib/db.js";

export default async function handler(req, res) {
  try {
    await initDb();
    const token = req.query.token || req.headers["x-admin-token"];
    if (!token || token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

    const { rows } = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 300`;
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message || "Admin error" });
  }
}
