# Fantasy Face-Off

A finished-up Next.js app for your IPL fantasy rivalry site. It has:

- public rivalry homepage
- public per-author history pages
- public post pages with clean URLs
- secure per-author login
- private dashboard to publish posts and update the live overview
- SQLite-backed article and league storage
- local multi-image uploads for articles
- Docker support

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

The app seeds itself from `data/league.json` on first run, then stores real data in `data/app.db`. New articles, image references, deletions, and league updates are written into SQLite through the dashboard. Uploaded image files are stored in `public/uploads`.
