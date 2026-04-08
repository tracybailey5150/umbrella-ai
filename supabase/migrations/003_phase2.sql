-- ─── PHASE 2: BILLING, BUYER AGENT, SUPPLY WATCH ─────────────────────────────

-- Stripe customers (one per org)
create table stripe_customers (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid unique references organizations(id) on delete cascade,
  stripe_customer_id  text unique not null,
  billing_email       text,
  created_at          timestamptz default now()
);
alter table stripe_customers enable row level security;
create policy "org members" on stripe_customers for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Subscriptions (active plan per org)
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid unique references organizations(id) on delete cascade,
  stripe_subscription_id  text unique,
  stripe_price_id         text,
  plan                    text not null default 'free',   -- free | pro | business
  status                  text not null default 'active', -- active | past_due | canceled | trialing
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean default false,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);
alter table subscriptions enable row level security;
create policy "org members" on subscriptions for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Email logs
create table email_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  lead_id     uuid references leads(id) on delete set null,
  recipient   text not null,
  subject     text not null,
  template    text,
  status      text default 'sent',   -- sent | failed | bounced
  resend_id   text,
  created_at  timestamptz default now()
);
alter table email_logs enable row level security;
create policy "org members" on email_logs for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Buyer agent configurations
create table buyer_agent_configs (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizations(id) on delete cascade,
  name             text not null,
  category         text not null,   -- property | vehicle | equipment | services | other
  description      text,
  budget_min       numeric,
  budget_max       numeric,
  location         text,
  requirements     jsonb default '[]',   -- array of {key, value} requirement objects
  auto_follow_up   boolean default true,
  is_active        boolean default true,
  match_count      integer default 0,
  last_run_at      timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table buyer_agent_configs enable row level security;
create policy "org members" on buyer_agent_configs for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Buyer agent matches (leads that matched a config)
create table buyer_agent_matches (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organizations(id) on delete cascade,
  config_id     uuid references buyer_agent_configs(id) on delete cascade,
  lead_id       uuid references leads(id) on delete cascade,
  match_score   integer default 0,   -- 0-100
  match_reasons jsonb default '[]',
  notified      boolean default false,
  created_at    timestamptz default now()
);
alter table buyer_agent_matches enable row level security;
create policy "org members" on buyer_agent_matches for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Supply price watch items
create table price_watch_items (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid references organizations(id) on delete cascade,
  name                 text not null,
  category             text not null,   -- materials | labor | fuel_logistics | equipment_rental | regulatory
  unit                 text,            -- per sq ft, per hour, per gallon, etc.
  current_price        numeric,
  previous_price       numeric,
  price_change_pct     numeric,
  source               text,
  notes                text,
  alert_threshold_pct  numeric default 5,   -- alert when change exceeds this %
  is_active            boolean default true,
  last_checked_at      timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
alter table price_watch_items enable row level security;
create policy "org members" on price_watch_items for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Supply price signals (history of price movements)
create table price_watch_signals (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organizations(id) on delete cascade,
  item_id       uuid references price_watch_items(id) on delete cascade,
  category      text not null,
  signal_type   text not null,   -- increase | decrease | stable | alert
  old_price     numeric,
  new_price     numeric,
  change_pct    numeric,
  source        text,
  headline      text,
  created_at    timestamptz default now()
);
alter table price_watch_signals enable row level security;
create policy "org members" on price_watch_signals for all using (org_id = (select org_id from profiles where id = auth.uid()));

-- Indexes
create index on buyer_agent_configs(org_id);
create index on buyer_agent_matches(org_id, config_id);
create index on price_watch_items(org_id, category);
create index on price_watch_signals(org_id, created_at desc);
create index on email_logs(org_id, created_at desc);
