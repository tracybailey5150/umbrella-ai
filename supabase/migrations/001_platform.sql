-- ─── PLATFORM FOUNDATION ─────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- Organizations (root tenant)
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'trial',  -- trial | starter | pro | enterprise
  logo_url    text,
  website     text,
  industry    text,
  settings    jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Profiles (user accounts linked to orgs)
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  org_id        uuid references organizations(id) on delete cascade,
  email         text,
  first_name    text,
  last_name     text,
  display_name  text,
  role          text not null default 'member',  -- owner | admin | member | viewer
  avatar_url    text,
  is_active     boolean default true,
  last_seen_at  timestamptz,
  created_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Modules (feature flags per org)
create table org_modules (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  module      text not null,  -- quote_agent | buyer_agent | market_watch | training
  enabled     boolean default true,
  settings    jsonb default '{}',
  created_at  timestamptz default now(),
  unique(org_id, module)
);

-- Audit log
create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  meta        jsonb default '{}',
  created_at  timestamptz default now()
);

-- ─── HELPER ───────────────────────────────────────────────────────────────────

create or replace function auth_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from profiles where id = auth.uid()
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table org_modules enable row level security;
alter table audit_log enable row level security;

create policy "org members see their org" on organizations
  for select using (id = auth_org_id());

create policy "members see org profiles" on profiles
  for select using (org_id = auth_org_id());

create policy "own profile update" on profiles
  for update using (id = auth.uid());

create policy "org modules visible" on org_modules
  for select using (org_id = auth_org_id());

create policy "audit log org scoped" on audit_log
  for select using (org_id = auth_org_id());

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

create index idx_profiles_org on profiles(org_id);
create index idx_org_modules_org on org_modules(org_id);
create index idx_audit_log_org on audit_log(org_id);
create index idx_audit_log_created on audit_log(created_at desc);
