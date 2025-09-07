-- Supabase schema for Coffee Collection app
-- Requires: Supabase project with Auth enabled.

create extension if not exists "uuid-ossp";

-- All tables include user_id referencing auth.users
-- Core entities
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

create table if not exists public.bean_batches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  roaster text,
  roast_level text,
  roast_date date,
  origin_country text,
  origin_region text,
  farm text,
  variety text,
  process text,
  purchase_shop_id uuid references public.shops(id) on delete set null,
  purchase_date date,
  price numeric(12,2),
  initial_weight_g integer,
  current_weight_g integer,
  notes text,
  archived boolean not null default false,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_batch_id uuid not null references public.bean_batches(id) on delete cascade,
  method text not null,
  dose_g numeric(6,2),
  grind text,
  water_g numeric(6,2),
  temperature_c numeric(4,1),
  time_sec integer,
  agitation text,
  equipment text[],
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.tastings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brew_id uuid not null references public.brews(id) on delete cascade,
  liking smallint not null check (liking between 1 and 5),
  aroma smallint not null check (aroma between 1 and 5),
  sourness smallint not null check (sourness between 1 and 5),
  bitterness smallint not null check (bitterness between 1 and 5),
  sweetness smallint check (sweetness between 1 and 5),
  body smallint check (body between 1 and 5),
  aftertaste smallint check (aftertaste between 1 and 5),
  flavor_notes text[],
  comment text,
  photos text[], -- store public URLs or storage paths
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_batch_id uuid not null references public.bean_batches(id) on delete cascade,
  delta_g integer not null,
  reason text not null check (reason in ('brew','adjust','other')),
  at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_shops_user on public.shops(user_id);
create index if not exists idx_beans_user on public.bean_batches(user_id);
create index if not exists idx_beans_roast_date on public.bean_batches(roast_date);
create index if not exists idx_brews_user on public.brews(user_id);
create index if not exists idx_brews_bean on public.brews(bean_batch_id);
create index if not exists idx_tastings_user on public.tastings(user_id);
create index if not exists idx_tastings_brew on public.tastings(brew_id);
create index if not exists idx_tastings_scores on public.tastings(liking, aroma, sourness, bitterness);
create index if not exists idx_inventory_user on public.inventory_logs(user_id);
create index if not exists idx_inventory_bean on public.inventory_logs(bean_batch_id);

-- Triggers for updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_shops_updated on public.shops;
create trigger trg_shops_updated before update on public.shops
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_beans_updated on public.bean_batches;
create trigger trg_beans_updated before update on public.bean_batches
for each row execute procedure public.set_updated_at();

-- RLS policies
alter table public.shops enable row level security;
alter table public.bean_batches enable row level security;
alter table public.brews enable row level security;
alter table public.tastings enable row level security;
alter table public.inventory_logs enable row level security;

-- Generic owner-only policies
create policy shops_select on public.shops for select using (auth.uid() = user_id);
create policy shops_insert on public.shops for insert with check (auth.uid() = user_id);
create policy shops_update on public.shops for update using (auth.uid() = user_id);
create policy shops_delete on public.shops for delete using (auth.uid() = user_id);

create policy beans_select on public.bean_batches for select using (auth.uid() = user_id);
create policy beans_insert on public.bean_batches for insert with check (auth.uid() = user_id);
create policy beans_update on public.bean_batches for update using (auth.uid() = user_id);
create policy beans_delete on public.bean_batches for delete using (auth.uid() = user_id);

create policy brews_select on public.brews for select using (auth.uid() = user_id);
create policy brews_insert on public.brews for insert with check (auth.uid() = user_id);
create policy brews_update on public.brews for update using (auth.uid() = user_id);
create policy brews_delete on public.brews for delete using (auth.uid() = user_id);

create policy tastings_select on public.tastings for select using (auth.uid() = user_id);
create policy tastings_insert on public.tastings for insert with check (auth.uid() = user_id);
create policy tastings_update on public.tastings for update using (auth.uid() = user_id);
create policy tastings_delete on public.tastings for delete using (auth.uid() = user_id);

create policy inv_select on public.inventory_logs for select using (auth.uid() = user_id);
create policy inv_insert on public.inventory_logs for insert with check (auth.uid() = user_id);
create policy inv_update on public.inventory_logs for update using (auth.uid() = user_id);
create policy inv_delete on public.inventory_logs for delete using (auth.uid() = user_id);

-- Storage bucket (run in Supabase UI or SQL to create bucket)
-- select storage.create_bucket('photos', true);
-- Then add storage policies for owner-only access using user_id in path prefix.

