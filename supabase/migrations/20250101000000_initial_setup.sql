-- Coffee Collection App - Initial Setup Migration
-- This is the complete initial schema for the Coffee Collection application
-- Run this migration first when setting up a new Supabase project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Core entities

-- Shops table for coffee shops, roasters, and online stores
create table if not exists public.shops (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('shop','roaster','online')),
  url text,
  address text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bean batches table with integrated tasting information
-- This table contains both bean information and tasting data in a 1:1 relationship
create table if not exists public.bean_batches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Bean information
  name text not null,
  roaster_shop_id uuid references public.shops(id) on delete set null,
  roast_level text,
  roast_date date,
  origin_country text,
  farm text,
  variety text,
  process text,
  purchase_shop_id uuid references public.shops(id) on delete set null,
  purchase_date date,
  price numeric,
  initial_weight_g integer,
  current_weight_g integer,
  notes text,
  archived boolean not null default false,
  tags text[] default '{}',

  -- Integrated tasting information (1:1 relationship) - 10-point scale
  liking smallint check (liking between 1 and 10),
  aroma smallint check (aroma between 1 and 10),
  sourness smallint check (sourness between 1 and 10),
  bitterness smallint check (bitterness between 1 and 10),
  sweetness smallint check (sweetness between 1 and 10),
  body smallint check (body between 1 and 10),
  aftertaste smallint check (aftertaste between 1 and 10),
  tasting_comment text,
  tasting_photos text[],
  tasted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bean origins table for supporting multiple origins (blends)
create table if not exists public.bean_origins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_batch_id uuid not null references public.bean_batches(id) on delete cascade,
  origin text not null,
  ordinal integer not null default 0,
  created_at timestamptz not null default now()
);

-- Flavor notes table for detailed tasting notes
create table if not exists public.flavor_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_batch_id uuid not null references public.bean_batches(id) on delete cascade,
  note text not null,
  ordinal integer not null default 0,
  created_at timestamptz not null default now()
);


-- Indexes for performance
-- User-based indexes (most common query pattern)
create index if not exists idx_shops_user on public.shops(user_id);
create index if not exists idx_beans_user on public.bean_batches(user_id);
create index if not exists idx_bean_origins_user on public.bean_origins(user_id);
create index if not exists idx_flavor_notes_user on public.flavor_notes(user_id);

-- Bean-specific indexes
create index if not exists idx_beans_roast_date on public.bean_batches(roast_date);
create index if not exists idx_beans_tasting_scores on public.bean_batches(liking, aroma, sourness, bitterness);
create index if not exists idx_bean_origins_bean on public.bean_origins(bean_batch_id);
create index if not exists idx_flavor_notes_bean on public.flavor_notes(bean_batch_id);

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
drop trigger if exists trg_shops_updated on public.shops;
create trigger trg_shops_updated before update on public.shops
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_beans_updated on public.bean_batches;
create trigger trg_beans_updated before update on public.bean_batches
for each row execute procedure public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.shops enable row level security;
alter table public.bean_batches enable row level security;
alter table public.bean_origins enable row level security;
alter table public.flavor_notes enable row level security;

-- RLS Policies - Owner-only access for all tables

-- Shops policies
create policy shops_select on public.shops for select using (auth.uid() = user_id);
create policy shops_insert on public.shops for insert with check (auth.uid() = user_id);
create policy shops_update on public.shops for update using (auth.uid() = user_id);
create policy shops_delete on public.shops for delete using (auth.uid() = user_id);

-- Bean batches policies
create policy beans_select on public.bean_batches for select using (auth.uid() = user_id);
create policy beans_insert on public.bean_batches for insert with check (auth.uid() = user_id);
create policy beans_update on public.bean_batches for update using (auth.uid() = user_id);
create policy beans_delete on public.bean_batches for delete using (auth.uid() = user_id);

-- Bean origins policies
create policy bean_origins_select on public.bean_origins for select using (auth.uid() = user_id);
create policy bean_origins_insert on public.bean_origins for insert with check (auth.uid() = user_id);
create policy bean_origins_update on public.bean_origins for update using (auth.uid() = user_id);
create policy bean_origins_delete on public.bean_origins for delete using (auth.uid() = user_id);

-- Flavor notes policies
create policy flavor_notes_select on public.flavor_notes for select using (auth.uid() = user_id);
create policy flavor_notes_insert on public.flavor_notes for insert with check (auth.uid() = user_id);
create policy flavor_notes_update on public.flavor_notes for update using (auth.uid() = user_id);
create policy flavor_notes_delete on public.flavor_notes for delete using (auth.uid() = user_id);

-- ========================================
-- Public read access policies for anonymous users
-- This enables the app to work as a read-only experience for non-logged-in users
-- ========================================

-- Bean batches - allow public read access
create policy beans_public_select on public.bean_batches
for select
to anon
using (true);

-- Bean origins - allow public read access
create policy bean_origins_public_select on public.bean_origins
for select
to anon
using (true);

-- Flavor notes - allow public read access
create policy flavor_notes_public_select on public.flavor_notes
for select
to anon
using (true);

-- Shops - allow public read access
create policy shops_public_select on public.shops
for select
to anon
using (true);


-- Storage bucket for photos (optional - run manually in Supabase if needed)
-- select storage.create_bucket('photos', true);
-- Then add storage policies for owner-only access using user_id in path prefix.

-- Migration complete
-- This migration creates the complete schema for the Coffee Collection app:
-- - shops: Coffee shops, roasters, and online stores
-- - bean_batches: Coffee beans with integrated tasting information (10-point rating scale, includes current_weight_g for simple weight tracking)
-- - bean_origins: Multiple origins support for blends
-- - flavor_notes: Detailed tasting flavor notes
-- All tables include proper RLS policies for multi-user support.