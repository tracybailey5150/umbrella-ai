-- ─── QUOTE / INTAKE AGENT ────────────────────────────────────────────────────

-- Intake agent configurations (one org can have multiple agents for different verticals)
create table intake_agents (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizations(id) on delete cascade,
  name            text not null,
  vertical        text not null default 'general',  -- hvac | av | contractor | real_estate | general
  description     text,
  greeting        text default 'Hi! I can help you get a quote. What can we help you with today?',
  questions       jsonb default '[]',               -- ordered qualifying questions
  tone            text default 'professional',       -- professional | friendly | formal
  ai_instructions text,                             -- custom prompt instructions
  is_active       boolean default true,
  embed_key       text unique default encode(gen_random_bytes(16), 'hex'),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Leads captured by intake agents
create table leads (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizations(id) on delete cascade,
  agent_id         uuid references intake_agents(id) on delete set null,
  -- Contact info
  name             text,
  email            text,
  phone            text,
  company          text,
  -- Lead data
  status           text not null default 'new',  -- new | contacted | qualified | quoted | won | lost | unresponsive
  priority         text not null default 'normal',  -- low | normal | high | urgent
  score            int default 0,               -- 0-100 AI qualification score
  source           text default 'intake_form',  -- intake_form | manual | import | api
  -- Scope & summary
  raw_intake       text,                        -- raw text from intake session
  scope_summary    text,                        -- AI-generated scope summary
  qualification    jsonb default '{}',          -- structured qualification data
  estimated_value  numeric(12,2),
  -- Assignment
  assigned_to      uuid references profiles(id) on delete set null,
  -- Timing
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Activity timeline per lead
create table lead_activities (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references organizations(id) on delete cascade,
  lead_id     uuid references leads(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,
  type        text not null,  -- note | status_change | follow_up | email | call | ai_score | intake
  content     text,
  meta        jsonb default '{}',
  created_at  timestamptz default now()
);

-- Follow-up queue
create table follow_ups (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade,
  lead_id      uuid references leads(id) on delete cascade,
  assigned_to  uuid references profiles(id) on delete set null,
  type         text not null default 'call',  -- call | email | text | meeting | task
  notes        text,
  due_at       timestamptz not null,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ─── MARKET WATCH LITE ───────────────────────────────────────────────────────

-- Raw signals ingested from external sources
create table market_signals (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete cascade,
  source       text not null,        -- google_trends | reddit | news | manual
  source_url   text,
  title        text not null,
  content      text,
  category     text,                 -- hvac | construction | av | real_estate | general
  raw_score    numeric(5,2) default 0,
  created_at   timestamptz default now()
);

-- Normalized trend topics (clustered from signals)
create table trend_topics (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organizations(id) on delete cascade,
  title         text not null,
  summary       text,
  category      text,
  relevance     text default 'medium',  -- low | medium | high | urgent
  score         int default 0,
  signal_count  int default 1,
  tags          text[] default '{}',
  is_actionable boolean default false,
  action_note   text,
  first_seen_at timestamptz default now(),
  last_seen_at  timestamptz default now(),
  created_at    timestamptz default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table intake_agents enable row level security;
alter table leads enable row level security;
alter table lead_activities enable row level security;
alter table follow_ups enable row level security;
alter table market_signals enable row level security;
alter table trend_topics enable row level security;

create policy "org intake agents" on intake_agents for all using (org_id = auth_org_id());
create policy "org leads" on leads for all using (org_id = auth_org_id());
create policy "org lead activities" on lead_activities for all using (org_id = auth_org_id());
create policy "org follow ups" on follow_ups for all using (org_id = auth_org_id());
create policy "org market signals" on market_signals for all using (org_id = auth_org_id());
create policy "org trend topics" on trend_topics for all using (org_id = auth_org_id());

-- Public intake: allow anonymous insert to leads (via embed)
create policy "public intake insert" on leads for insert with check (true);
create policy "public intake agent read" on intake_agents for select using (is_active = true);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

create index idx_intake_agents_org on intake_agents(org_id);
create index idx_leads_org on leads(org_id);
create index idx_leads_status on leads(org_id, status);
create index idx_leads_score on leads(org_id, score desc);
create index idx_lead_activities_lead on lead_activities(lead_id, created_at desc);
create index idx_follow_ups_due on follow_ups(org_id, due_at) where completed_at is null;
create index idx_trend_topics_score on trend_topics(org_id, score desc);
