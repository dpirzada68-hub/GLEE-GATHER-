-- Run this once against your Neon database before first deploy.
-- (Neon SQL Editor, or: psql "$DATABASE_URL" -f schema.sql)

CREATE TABLE IF NOT EXISTS app_store (
    id         INTEGER PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed an empty row so the very first GET has something to find
-- (the app will also seed demo data client-side if this is empty/null,
-- so this INSERT is optional).
INSERT INTO app_store (id, data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
