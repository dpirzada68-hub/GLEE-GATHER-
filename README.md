# Glee Gather — Inventory & Kitting Portal

Static front-end (`index.html`) + one Vercel serverless function (`api/store.js`)
that persists the app's data in a Neon Postgres database instead of the
browser's `localStorage`.

## How it works

The original app kept everything (products, categories, persons, kits,
transactions, logs, recycle bin, login credentials) in one JS object called
`store`, saved as a single JSON blob to `localStorage`. To keep the app
compatible without rewriting all of its internal logic, that same blob is now
persisted as one JSONB row in Neon:

- `loadStore()` → `GET /api/store` → reads the row from Neon (falls back to
  the local cache if the API is unreachable, e.g. offline).
- `saveStore()` → writes to `localStorage` instantly (so the UI never waits),
  then `PUT /api/store` syncs to Neon in the background (debounced ~500ms so
  rapid edits don't spam requests).

There's a small "Syncing… / Synced / Sync failed" indicator in the header so
you can see when a save has reached the database.

## 1. Create the Neon database table

In the Neon SQL Editor (or via `psql`), run the contents of `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS app_store (
    id         INTEGER PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_store (id, data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
```

## 2. Deploy to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it with the
   Vercel CLI — no build step is needed, it's static HTML + one API route).
2. In the Vercel Project Settings → **Environment Variables**, add:
   - `DATABASE_URL` = your Neon **pooled** connection string
     (Neon dashboard → Connect → copy the `postgresql://...` URL).
3. Deploy. Vercel auto-detects the `api/` folder as serverless functions and
   serves `index.html` as the static site — no framework/build config needed.

## 3. Local development (optional)

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL
npx vercel dev
```

## Notes / things worth knowing

- **Single shared record:** everyone who opens the app reads/writes the same
  row (`id = 1`) — there's no per-user data separation. That matches the
  original single-login design (one shared "Inventory Manager" account). If
  you later need multiple independent inventories, the schema would need a
  `user_id`/`org_id` column and the API would need to scope by it.
- **Login stays in the database too:** the username/password shown in
  Control Panel → Login Settings is just a field (`auth.username`/`auth.password`)
  inside the same JSON blob — not real authentication. Fine for an internal
  tool behind a private URL, but anyone with the URL and no login can still
  view the raw JSON via `GET /api/store`. If this needs to be locked down,
  add a check (e.g. an `Authorization` header/shared secret, or Vercel's
  password protection) in front of `api/store.js`.
- **Last write wins:** if two people save at nearly the same moment, the
  later `PUT` overwrites the earlier one (same behavior as before, just now
  shared across devices instead of per-browser).
- **Images:** product photo uploads are still stored as base64 data URLs
  inside the JSON blob (same as before). That's fine for a handful of images,
  but will bloat the JSONB row and slow down loads if you upload many/large
  images. If that becomes a problem, switch to Vercel Blob or Neon +
  object storage for images and store just the URL.
