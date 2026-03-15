create table if not exists public.users (
  id text primary key,
  slug text unique not null,
  name text not null,
  password_hash text not null,
  password_salt text not null
);

create table if not exists public.players (
  id text primary key,
  slug text unique not null,
  name text not null,
  style text not null,
  bio text not null,
  total_points integer not null,
  summary text not null,
  captain text not null,
  team_name text not null,
  team_json jsonb not null
);

create table if not exists public.league_state (
  id integer primary key,
  fixture text not null,
  journal_date text not null
);

create table if not exists public.posts (
  id text primary key,
  slug text unique not null,
  author_slug text not null references public.players(slug) on delete cascade,
  title text not null,
  date text not null,
  result text not null,
  summary text not null,
  content text not null,
  image_url text not null default '',
  tags_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_slug_idx on public.posts(author_slug);
create index if not exists posts_date_idx on public.posts(date desc, created_at desc);

insert into public.league_state (id, fixture, journal_date)
values (1, 'MI vs CSK', '15 March 2026')
on conflict (id) do nothing;
