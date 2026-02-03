# Supabase setup (GitHub Pages + Admin-only views)

## 1) Create Supabase project
- Create a new project in Supabase.
- Note the **Project URL** and **anon key**.

## 2) Create table and RPC
Run this SQL in Supabase SQL editor:

```sql
create extension if not exists pgcrypto;

create table if not exists public.articles (
  id text primary key,
  status text not null default 'published',
  list_meta text,
  list_title text,
  list_title_class text,
  list_summary text,
  list_summary_class text,
  header_title text,
  header_title_class text,
  header_meta text,
  translation_title text,
  translation_title_class text,
  translation_meta text,
  content_html text,
  translation_html text,
  lottie jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.article_views (
  article_id text primary key,
  views bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.article_views_monthly (
  article_id text not null,
  month text not null,
  views bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (article_id, month)
);

create table if not exists public.article_reactions (
  article_id text primary key,
  loves bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  name text not null,
  comment text not null,
  created_at timestamptz not null default now()
);

create or replace function public.increment_article_view(article_id_input text)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.article_views (article_id, views)
  values (article_id_input, 1)
  on conflict (article_id) do update
  set views = public.article_views.views + 1,
      updated_at = now();
end;
$$;

create or replace function public.increment_article_view_monthly(article_id_input text)
returns void
language plpgsql
security definer
as $$
declare
  month_key text := to_char(now(), 'YYYY-MM');
begin
  insert into public.article_views (article_id, views)
  values (article_id_input, 1)
  on conflict (article_id) do update
  set views = public.article_views.views + 1,
      updated_at = now();

  insert into public.article_views_monthly (article_id, month, views)
  values (article_id_input, month_key, 1)
  on conflict (article_id, month) do update
  set views = public.article_views_monthly.views + 1,
      updated_at = now();
end;
$$;

create or replace function public.increment_article_love(article_id_input text)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.article_reactions (article_id, loves)
  values (article_id_input, 1)
  on conflict (article_id) do update
  set loves = public.article_reactions.loves + 1,
      updated_at = now();
end;
$$;
```

## 3) Enable RLS and policies
```sql
alter table public.article_views enable row level security;
alter table public.article_views_monthly enable row level security;
alter table public.articles enable row level security;
alter table public.article_reactions enable row level security;
alter table public.article_comments enable row level security;

-- Allow anonymous users to call the increment function (RPC), but not select data.
-- No select policy for anon users.

-- Allow authenticated admin to read.
create policy "Admin can read views"
  on public.article_views
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'pijushkantiroy2040@gmail.com');

create policy "Public can read total views"
  on public.article_views
  for select
  to anon
  using (true);

create policy "Public can read total loves"
  on public.article_reactions
  for select
  to anon
  using (true);

create policy "Authenticated can read total loves"
  on public.article_reactions
  for select
  to authenticated
  using (true);

create policy "Public can add loves"
  on public.article_reactions
  for insert
  to anon
  with check (true);

create policy "Public can update loves"
  on public.article_reactions
  for update
  to anon
  using (true)
  with check (true);

create policy "Public can read comments"
  on public.article_comments
  for select
  to anon
  using (true);

create policy "Public can add comments"
  on public.article_comments
  for insert
  to anon
  with check (true);

create policy "Admin can delete comments"
  on public.article_comments
  for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'pijushkantiroy2040@gmail.com');

create policy "Public can read published articles"
  on public.articles
  for select
  to anon
  using (status = 'published');

create policy "Admin can manage articles"
  on public.articles
  for all
  to authenticated
  using (auth.jwt() ->> 'email' = 'pijushkantiroy2040@gmail.com')
  with check (auth.jwt() ->> 'email' = 'pijushkantiroy2040@gmail.com');

create policy "Public can read monthly views"
  on public.article_views_monthly
  for select
  to anon
  using (true);
```

Replace `YOUR_ADMIN_EMAIL` with your admin email.

## 4) Configure credentials in site
Edit [assets/supabase-config.js](assets/supabase-config.js) and set:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 5) Create admin user
- In Supabase Auth, create a user with the admin email + password.
- Use [admin.html](admin.html) to log in and view counts.

## 6) Deploy
- GitHub Pages hosts the frontend.
- Supabase hosts the backend services.

## Notes
- Article views are tracked per session to avoid inflating counts.
- Admin dashboard is private; only your email can read the table.
