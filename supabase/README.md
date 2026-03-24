# Supabase Handoff

## What this folder contains

- [schema.sql](/Users/favourolaboye/Documents/andrena/supabase/schema.sql)

This schema maps the current normalized local pilot store to Postgres tables so the project can move off `data/pilot-db.json`.

## How to apply it

1. Open your Supabase project.
2. Go to the SQL Editor.
3. Paste the contents of [schema.sql](/Users/favourolaboye/Documents/andrena/supabase/schema.sql).
4. Run it once on an empty schema.

## Important note

The app now uses Supabase automatically when the server env contains:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The publishable key can still be kept for future client-side reads:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

## Current behavior

- Supabase is the primary storage backend.
- `data/pilot-db.json` is still written as a local backup mirror.
- If the remote tables are empty on first boot, the app seeds Supabase from the local file snapshot.

## Recommended next migration step

1. Run [schema.sql](/Users/favourolaboye/Documents/andrena/supabase/schema.sql).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env`.
3. Start the app once.
4. If the remote tables are empty, the app will bootstrap them from `data/pilot-db.json`.
