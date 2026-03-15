create table if not exists public.users (
  id text primary key,
  slug text unique not null,
  name text not null,
  username text unique,
  email text,
  role text not null default 'author',
  password_hash text not null,
  password_salt text not null
);

alter table public.users add column if not exists username text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists role text not null default 'author';

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

create table if not exists public.comments (
  id text primary key,
  post_slug text not null references public.posts(slug) on delete cascade,
  reader_slug text references public.users(slug) on delete set null,
  parent_comment_id text references public.comments(id) on delete cascade,
  author_username text,
  author_role text not null default 'guest',
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.comments add column if not exists parent_comment_id text references public.comments(id) on delete cascade;
alter table public.comments add column if not exists author_username text;
alter table public.comments add column if not exists author_role text not null default 'guest';

create table if not exists public.notifications (
  id text primary key,
  reader_slug text not null references public.users(slug) on delete cascade,
  post_slug text not null references public.posts(slug) on delete cascade,
  comment_id text references public.comments(id) on delete cascade,
  actor_name text not null,
  actor_username text,
  type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_slug_idx on public.posts(author_slug);
create index if not exists posts_date_idx on public.posts(date desc, created_at desc);
create unique index if not exists users_username_idx on public.users(username);
create index if not exists comments_post_slug_idx on public.comments(post_slug, created_at);
create index if not exists comments_parent_idx on public.comments(parent_comment_id);
create index if not exists notifications_reader_created_idx on public.notifications(reader_slug, created_at desc);

insert into public.league_state (id, fixture, journal_date)
values (1, 'MI vs CSK', '15 March 2026')
on conflict (id) do nothing;
