-- Prisma migration managed schema for Coffee Collection App
-- Converted from Supabase SQL migration to run via Prisma migrate deploy

create extension if not exists "uuid-ossp";

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

create table if not exists public.bean_origins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_batch_id uuid not null references public.bean_batches(id) on delete cascade,
  origin text not null,
  ordinal integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.flavor_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bean_batch_id uuid not null references public.bean_batches(id) on delete cascade,
  note text not null,
  ordinal integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_shops_user on public.shops(user_id);
create index if not exists idx_beans_user on public.bean_batches(user_id);
create index if not exists idx_bean_origins_user on public.bean_origins(user_id);
create index if not exists idx_flavor_notes_user on public.flavor_notes(user_id);
create index if not exists idx_beans_roast_date on public.bean_batches(roast_date);
create index if not exists idx_beans_tasting_scores on public.bean_batches(liking, aroma, sourness, bitterness);
create index if not exists idx_bean_origins_bean on public.bean_origins(bean_batch_id);
create index if not exists idx_flavor_notes_bean on public.flavor_notes(bean_batch_id);

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

alter table public.shops enable row level security;
alter table public.bean_batches enable row level security;
alter table public.bean_origins enable row level security;
alter table public.flavor_notes enable row level security;

drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops for select using (auth.uid() = user_id);
drop policy if exists shops_insert on public.shops;
create policy shops_insert on public.shops for insert with check (auth.uid() = user_id);
drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops for update using (auth.uid() = user_id);
drop policy if exists shops_delete on public.shops;
create policy shops_delete on public.shops for delete using (auth.uid() = user_id);

drop policy if exists beans_select on public.bean_batches;
create policy beans_select on public.bean_batches for select using (auth.uid() = user_id);
drop policy if exists beans_insert on public.bean_batches;
create policy beans_insert on public.bean_batches for insert with check (auth.uid() = user_id);
drop policy if exists beans_update on public.bean_batches;
create policy beans_update on public.bean_batches for update using (auth.uid() = user_id);
drop policy if exists beans_delete on public.bean_batches;
create policy beans_delete on public.bean_batches for delete using (auth.uid() = user_id);

drop policy if exists bean_origins_select on public.bean_origins;
create policy bean_origins_select on public.bean_origins for select using (auth.uid() = user_id);
drop policy if exists bean_origins_insert on public.bean_origins;
create policy bean_origins_insert on public.bean_origins for insert with check (auth.uid() = user_id);
drop policy if exists bean_origins_update on public.bean_origins;
create policy bean_origins_update on public.bean_origins for update using (auth.uid() = user_id);
drop policy if exists bean_origins_delete on public.bean_origins;
create policy bean_origins_delete on public.bean_origins for delete using (auth.uid() = user_id);

drop policy if exists flavor_notes_select on public.flavor_notes;
create policy flavor_notes_select on public.flavor_notes for select using (auth.uid() = user_id);
drop policy if exists flavor_notes_insert on public.flavor_notes;
create policy flavor_notes_insert on public.flavor_notes for insert with check (auth.uid() = user_id);
drop policy if exists flavor_notes_update on public.flavor_notes;
create policy flavor_notes_update on public.flavor_notes for update using (auth.uid() = user_id);
drop policy if exists flavor_notes_delete on public.flavor_notes;
create policy flavor_notes_delete on public.flavor_notes for delete using (auth.uid() = user_id);

drop policy if exists beans_public_select on public.bean_batches;
create policy beans_public_select on public.bean_batches for select to anon using (true);
drop policy if exists bean_origins_public_select on public.bean_origins;
create policy bean_origins_public_select on public.bean_origins for select to anon using (true);
drop policy if exists flavor_notes_public_select on public.flavor_notes;
create policy flavor_notes_public_select on public.flavor_notes for select to anon using (true);
drop policy if exists shops_public_select on public.shops;
create policy shops_public_select on public.shops for select to anon using (true);
