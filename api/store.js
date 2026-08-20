// /api/store — Vercel serverless function
// Reads/writes the entire app "store" (products, categories, persons, kits,
// transactions, logs, recycleBin, auth) as a single JSONB row in Neon.
//
// This mirrors exactly what the front-end used to keep in localStorage, so
// the rest of the app's logic didn't need to be rewritten — only saveStore()
// and loadStore() were changed to call this endpoint instead of
// localStorage.setItem/getItem.

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM app_store WHERE id = 1`;
      if (rows.length === 0) {
        return res.status(200).json({ data: null });
      }
      return res.status(200).json({ data: rows[0].data });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Request body must be a JSON object.' });
      }
      const dataStr = JSON.stringify(body);

      await sql`
        INSERT INTO app_store (id, data, updated_at)
        VALUES (1, ${dataStr}::jsonb, now())
        ON CONFLICT (id) DO UPDATE SET data = ${dataStr}::jsonb, updated_at = now()
      `;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('api/store error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
