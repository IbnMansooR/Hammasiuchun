# Feekr — Vercel + Supabase deploy

The app now uses **Supabase Postgres** (data) and **Supabase Storage** (fonts, media),
so it runs on serverless (Vercel). Locally, with no Supabase env set, it falls back to
the filesystem — so `npm run dev` still works as before.

Supabase project **Feekr** (`vjxvudfjzhfplezplrrw`) is already created; the DB schema and
the `fonts` / `webfonts` / `uploads` storage buckets are already set up.

## 1. Get two secrets from the Supabase dashboard
- **DB password** → Project → *Connect* → *ORMs / Prisma*: copy the exact `DATABASE_URL`
  (transaction pooler, port 6543) and `DIRECT_URL` (session/direct, 5432).
- **service_role key** → Settings → *API* → `service_role` (secret).

## 2. Fill `.env` (copy from `.env.example`)
```
SESSION_SECRET=...            # openssl rand -hex 32
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...            # your choice
DATABASE_URL=...             # from dashboard
DIRECT_URL=...               # from dashboard
SUPABASE_URL=https://vjxvudfjzhfplezplrrw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://<your-domain>
```

## 3. Seed the database + upload the font library (run once, locally)
```bash
npm run db:push        # optional — schema already applied, confirms in-sync
npm run db:seed        # inserts 2346 families / styles / articles / admin
npm run storage:upload # uploads font/ (663 MB) + media to Supabase Storage (resumable)
```

## 4. Deploy to Vercel
- Push the repo to GitHub and "Import Project" on Vercel (framework auto-detected as Next.js), **or** run `npx vercel` from the CLI.
- In Vercel → Settings → Environment Variables, add **all** the vars from step 2
  (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`). `ADMIN_*` are only needed for local seeding.
- Deploy. Build runs `prisma generate && next build`.

## Admin panel
`https://<your-vercel-domain>/admin` → login with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
Uploads (media + fonts) and edits now persist to Supabase — the panel works fully.

## Notes
- Fonts are served only through `/api/webfont` (private bucket + same-origin gate), never as static URLs.
- To let `next/image` optimize Supabase-hosted covers, optionally add the Supabase host to
  `images.remotePatterns` in `next.config.mjs` (works without it via a plain `<img>` fallback).
