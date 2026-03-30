# IPL Fantasy Faceoff

A finished-up Next.js app for your IPL fantasy rivalry site. It has:

- public rivalry homepage
- public per-author history pages
- public post pages with clean URLs
- secure per-author login
- private dashboard to publish posts and update the live overview
- SQLite-backed article and league storage
- local multi-image uploads for articles
- Docker support

## Vercel + Supabase + Cloudinary

For long-term hosting, use Vercel for the app, Supabase for data, and Cloudinary for article image storage.

### Supabase setup

1. Create a Supabase project.
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
3. Seed your initial data:
   - run `npm run seed:supabase`
4. Add these environment variables in both local `.env.local` and Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `NISCHAL_PASSWORD`
   - `SHREYAS_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL`

### Cloudinary setup

1. Create a Cloudinary account and product environment.
2. Copy your Cloud name, API key, and API secret from the Cloudinary dashboard.
3. Add these environment variables in both local `.env.local` and Vercel:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_FOLDER`

When the Cloudinary env vars are present, `/api/uploads` will send new article images to Cloudinary first. If Cloudinary is not configured, the app falls back to Supabase Storage, then to local `public/uploads`.

To migrate old Supabase-hosted article images into Cloudinary and rewrite the saved post URLs, run:

```bash
npm run migrate:cloudinary
```

### Vercel setup

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add the same environment variables in the Vercel project settings.
4. Set the production domain URL into `NEXT_PUBLIC_SITE_URL`.
5. Deploy.

When Supabase env vars are present, the app will use Supabase instead of local SQLite/filesystem storage for the database. When Cloudinary env vars are present, new uploaded images will be stored in Cloudinary.

## Stack

- Next.js app router
- SQLite backend using Node's built-in SQLite runtime
- signed cookie sessions
- password hashing for the two author accounts
- Supabase client dependency ready for a later hosted auth/database rollout

## Why this works

This gives you a proper app experience now without blocking on cloud setup. Public visitors can browse and search the content, while only signed-in owners can publish from `/dashboard`.

For production, the intended upgrade path is:

1. Move posts and standings from SQLite into Supabase tables.
2. Replace the local credential setup with real Supabase auth for you and Shreyas.
3. Deploy to Vercel.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `SESSION_SECRET`, `NISCHAL_PASSWORD`, and `SHREYAS_PASSWORD` to private values.
3. Install packages with `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.
6. Sign in at `/login` as either `Nischal` or `Shreyas`.

## Docker

1. Copy `.env.example` to `.env.local`.
2. Run `docker compose up --build`.
3. Open `http://localhost:3000`.

## Important routes

- `/` home page
- `/history/nischal`
- `/history/shreyas`
- `/posts/[slug]`
- `/login`
- `/dashboard`

## Storage

The app seeds itself from `data/league.json` on first run, then stores real data in `data/app.db`. New articles, image references, deletions, and league updates are written into SQLite through the dashboard until Supabase is configured.

Upload priority:

1. Cloudinary
2. Supabase Storage
3. local `public/uploads`
