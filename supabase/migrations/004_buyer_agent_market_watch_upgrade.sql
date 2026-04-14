-- ─── PHASE 4: BUYER AGENT + MARKET WATCH FULL UPGRADE ─────────────────────

-- Add keywords column to buyer_agent_configs for search terms
ALTER TABLE buyer_agent_configs ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}';

-- Add alert configuration columns to market_keywords
ALTER TABLE market_keywords ADD COLUMN IF NOT EXISTS alert_enabled boolean DEFAULT false;
ALTER TABLE market_keywords ADD COLUMN IF NOT EXISTS alert_threshold integer DEFAULT 50;
ALTER TABLE market_keywords ADD COLUMN IF NOT EXISTS alert_frequency text DEFAULT 'daily';
ALTER TABLE market_keywords ADD COLUMN IF NOT EXISTS notes text;

-- Add status/activity columns to market_competitors
ALTER TABLE market_competitors ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE market_competitors ADD COLUMN IF NOT EXISTS threat_level text DEFAULT 'medium';
ALTER TABLE market_competitors ADD COLUMN IF NOT EXISTS market_share_est numeric;
ALTER TABLE market_competitors ADD COLUMN IF NOT EXISTS last_analysis jsonb;

-- Create keyword_alerts table for keyword monitoring notifications
CREATE TABLE IF NOT EXISTS keyword_alerts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizations(id) on delete cascade,
  keyword_id      uuid references market_keywords(id) on delete cascade,
  alert_type      text not null default 'threshold',  -- threshold | trend_change | volume_spike
  title           text not null,
  description     text,
  severity        text default 'info',  -- info | warning | critical
  data            jsonb default '{}',
  is_read         boolean default false,
  created_at      timestamptz default now()
);
ALTER TABLE keyword_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org keyword alerts" ON keyword_alerts FOR ALL USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_org ON keyword_alerts(org_id, created_at DESC);

-- Create competitor_events table for tracking competitor activity
CREATE TABLE IF NOT EXISTS competitor_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizations(id) on delete cascade,
  competitor_id   uuid references market_competitors(id) on delete cascade,
  event_type      text not null,  -- product_launch | price_change | hiring | partnership | news | other
  title           text not null,
  description     text,
  source_url      text,
  impact          text default 'neutral',  -- positive | negative | neutral
  created_at      timestamptz default now()
);
ALTER TABLE competitor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org competitor events" ON competitor_events FOR ALL USING (
  org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_competitor_events_org ON competitor_events(org_id, created_at DESC);
