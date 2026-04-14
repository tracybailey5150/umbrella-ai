'use client'

import { useEffect, useState, useCallback } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Signal = { id: string; title: string; summary: string | null; category: string | null; relevance: string; score: number; signal_count: number; tags: string[]; is_actionable: boolean; action_note: string | null; last_seen_at: string }
type Competitor = { id: string; name: string; website: string | null; industry: string | null; notes: string | null; tracking_keywords: string[] | null; last_checked_at: string | null; created_at: string }
type Keyword = { id: string; keyword: string; category: string | null; trend_score: number; volume_change_pct: number | null; last_updated: string; created_at: string }
type Alert = { id: string; alert_type: string; title: string; description: string | null; severity: string; source: string | null; data: any; is_read: boolean; created_at: string }
type Report = { id: string; title: string; report_type: string; content: string; sections: any; created_at: string }
type TrendAnalysis = { summary: string; opportunities: string[]; risks: string[]; recommendations: string[]; trend_direction: string; confidence_score: number }
type CompetitorAnalysis = { overview: string; strengths: string[]; weaknesses: string[]; threats: string[]; opportunities: string[]; market_positioning: string; recommended_actions: string[] }

const TABS = ['Overview', 'Trends', 'Competitors', 'Keywords', 'Reports']
const KEYWORD_CATEGORIES = ['Technology', 'Services', 'Real Estate', 'Equipment', 'Materials', 'General']
const ALERT_TYPES = ['trend', 'competitor', 'keyword', 'market', 'custom']
const SEVERITIES = ['info', 'warning', 'critical']
const SEVERITY_COLOR: Record<string, string> = { info: '#6366F1', warning: '#F59E0B', critical: '#EF4444' }
const ALERT_TYPE_COLOR: Record<string, string> = { trend: '#10B981', competitor: '#8B5CF6', keyword: '#3B82F6', market: '#F59E0B', custom: '#64748B' }
const RELEVANCE_COLOR: Record<string, string> = { low: '#475569', medium: '#6366F1', high: '#F59E0B', urgent: '#EF4444' }

export default function MarketWatchPage() {
  const [tab, setTab] = useState(0)
  const [signals, setSignals] = useState<Signal[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  // Forms
  const [showSignalForm, setShowSignalForm] = useState(false)
  const [showCompForm, setShowCompForm] = useState(false)
  const [showKwForm, setShowKwForm] = useState(false)
  const [showAlertForm, setShowAlertForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Signal form
  const [sigForm, setSigForm] = useState({ title: '', summary: '', category: '', relevance: 'medium', tags: '', action_note: '' })
  // Competitor form
  const [compForm, setCompForm] = useState({ name: '', website: '', industry: '', tracking_keywords: '', notes: '' })
  // Keyword form
  const [kwForm, setKwForm] = useState({ keyword: '', category: 'General', alert_enabled: false, alert_threshold: 70, alert_frequency: 'daily' })
  // Alert form
  const [alertForm, setAlertForm] = useState({ title: '', description: '', alert_type: 'custom', severity: 'info' })

  // AI analysis
  const [analyzing, setAnalyzing] = useState(false)
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null)
  const [compAnalysis, setCompAnalysis] = useState<{ id: string; data: CompetitorAnalysis } | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [latestReport, setLatestReport] = useState<any>(null)
  const [viewingReport, setViewingReport] = useState<Report | null>(null)

  // Filters
  const [kwCategoryFilter, setKwCategoryFilter] = useState('all')
  const [alertTypeFilter, setAlertTypeFilter] = useState('all')
  const [alertSevFilter, setAlertSevFilter] = useState('all')
  const [alertReadFilter, setAlertReadFilter] = useState('all')
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const [sigRes, compRes, kwRes, alertRes, repRes] = await Promise.all([
      fetch('/api/market-watch?type=signals').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/market-watch?type=competitors').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/market-watch?type=keywords').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/market-watch?type=alerts').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/market-watch?type=reports').then(r => r.json()).catch(() => ({ data: [] })),
    ])
    setSignals(sigRes.data || [])
    setCompetitors(compRes.data || [])
    setKeywords(kwRes.data || [])
    setAlerts(alertRes.data || [])
    setReports(repRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */
  async function addSignal() {
    if (!sigForm.title) return
    setSaving(true)
    const tags = sigForm.tags.split(',').map(t => t.trim()).filter(Boolean)
    await fetch('/api/market-watch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'signal', title: sigForm.title, summary: sigForm.summary || null, category: sigForm.category || null, relevance: sigForm.relevance, tags, is_actionable: !!sigForm.action_note, action_note: sigForm.action_note || null }),
    })
    setSigForm({ title: '', summary: '', category: '', relevance: 'medium', tags: '', action_note: '' })
    setShowSignalForm(false)
    setSaving(false)
    load()
  }

  async function addCompetitor() {
    if (!compForm.name) return
    setSaving(true)
    const kws = compForm.tracking_keywords.split(',').map(t => t.trim()).filter(Boolean)
    await fetch('/api/market-watch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'competitor', name: compForm.name, website: compForm.website || null, industry: compForm.industry || null, tracking_keywords: kws, notes: compForm.notes || null }),
    })
    setCompForm({ name: '', website: '', industry: '', tracking_keywords: '', notes: '' })
    setShowCompForm(false)
    setSaving(false)
    load()
  }

  async function addKeyword() {
    if (!kwForm.keyword) return
    setSaving(true)
    await fetch('/api/market-watch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'keyword', keyword: kwForm.keyword, category: kwForm.category }),
    })
    // If alert monitoring is enabled, auto-create a keyword alert
    if (kwForm.alert_enabled) {
      await fetch('/api/market-watch/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Monitoring: ${kwForm.keyword}`,
          description: `Alert configured when trend score exceeds ${kwForm.alert_threshold}. Frequency: ${kwForm.alert_frequency}.`,
          alert_type: 'keyword',
          severity: 'info',
        }),
      })
    }
    setKwForm({ keyword: '', category: 'General', alert_enabled: false, alert_threshold: 70, alert_frequency: 'daily' })
    setShowKwForm(false)
    setSaving(false)
    load()
  }

  async function addAlert() {
    if (!alertForm.title) return
    setSaving(true)
    await fetch('/api/market-watch/alerts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertForm),
    })
    setAlertForm({ title: '', description: '', alert_type: 'custom', severity: 'info' })
    setShowAlertForm(false)
    setSaving(false)
    load()
  }

  async function markAlertsRead(ids: string[]) {
    await fetch('/api/market-watch/alerts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', ids }),
    })
    setSelectedAlerts(new Set())
    load()
  }

  async function dismissAlerts(ids: string[]) {
    await fetch(`/api/market-watch/alerts?bulk=${ids.join(',')}`, { method: 'DELETE' })
    setSelectedAlerts(new Set())
    load()
  }

  async function analyzeTrends() {
    setAnalyzing(true)
    setTrendAnalysis(null)
    const res = await fetch('/api/market-watch/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'trends' }),
    })
    const json = await res.json()
    setTrendAnalysis(json.data || null)
    setAnalyzing(false)
  }

  async function analyzeCompetitor(comp: Competitor) {
    setAnalyzing(true)
    setCompAnalysis(null)
    const res = await fetch('/api/market-watch/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'competitor', data: { competitor: comp } }),
    })
    const json = await res.json()
    setCompAnalysis({ id: comp.id, data: json.data })
    setAnalyzing(false)
  }

  async function generateReport() {
    setGeneratingReport(true)
    setLatestReport(null)
    const res = await fetch('/api/market-watch/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'report' }),
    })
    const json = await res.json()
    setLatestReport(json.data || null)
    setGeneratingReport(false)
    load()
  }

  async function deleteItem(type: string, id: string) {
    await fetch(`/api/market-watch?type=${type}&id=${id}`, { method: 'DELETE' })
    load()
  }

  /* ------------------------------------------------------------------ */
  /*  Computed                                                           */
  /* ------------------------------------------------------------------ */
  const avgTrendScore = keywords.length ? Math.round(keywords.reduce((a, k) => a + k.trend_score, 0) / keywords.length) : 0
  const todayAlerts = alerts.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString())
  const unreadAlerts = alerts.filter(a => !a.is_read)
  const filteredKeywords = kwCategoryFilter === 'all' ? keywords : keywords.filter(k => k.category === kwCategoryFilter)
  const filteredAlerts = alerts.filter(a => {
    if (alertTypeFilter !== 'all' && a.alert_type !== alertTypeFilter) return false
    if (alertSevFilter !== 'all' && a.severity !== alertSevFilter) return false
    if (alertReadFilter === 'read' && !a.is_read) return false
    if (alertReadFilter === 'unread' && a.is_read) return false
    return true
  })

  /* ------------------------------------------------------------------ */
  /*  SVG Trend Chart                                                    */
  /* ------------------------------------------------------------------ */
  function TrendChart() {
    const chartW = 700, chartH = 140, padX = 40, padY = 20
    // Generate 30-day mock activity from signals + alerts
    const days: number[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toDateString()
      const sigCount = signals.filter(s => new Date(s.last_seen_at).toDateString() === ds).length
      const alertCount = alerts.filter(a => new Date(a.created_at).toDateString() === ds).length
      days.push(sigCount + alertCount + Math.floor(Math.random() * 3))
    }
    const max = Math.max(...days, 5)
    const points = days.map((v, i) => {
      const x = padX + (i / 29) * (chartW - padX * 2)
      const y = padY + (1 - v / max) * (chartH - padY * 2)
      return `${x},${y}`
    }).join(' ')
    const areaPoints = `${padX},${chartH - padY} ${points} ${chartW - padX},${chartH - padY}`

    return (
      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padX} x2={chartW - padX} y1={padY + f * (chartH - padY * 2)} y2={padY + f * (chartH - padY * 2)} stroke="rgba(255,255,255,0.05)" />
        ))}
        {/* Area */}
        <polygon points={areaPoints} fill="url(#trendGrad)" />
        {/* Line */}
        <polyline points={points} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" />
        {/* Labels */}
        <text x={padX} y={chartH - 2} fill="#475569" fontSize="9">30d ago</text>
        <text x={chartW - padX} y={chartH - 2} fill="#475569" fontSize="9" textAnchor="end">Today</text>
        <text x={padX - 4} y={padY + 4} fill="#475569" fontSize="9" textAnchor="end">{max}</text>
        <text x={padX - 4} y={chartH - padY + 4} fill="#475569" fontSize="9" textAnchor="end">0</text>
      </svg>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Styles                                                             */
  /* ------------------------------------------------------------------ */
  const s = {
    page: { padding: '32px 36px', maxWidth: '1200px' } as React.CSSProperties,
    h1: { fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' } as React.CSSProperties,
    sub: { fontSize: '13px', color: '#64748B', marginBottom: '24px' } as React.CSSProperties,
    tabs: { display: 'flex', gap: '2px', marginBottom: '24px', background: '#0C1525', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({ padding: '9px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? 'rgba(99,102,241,0.15)' : 'transparent', color: active ? '#818CF8' : '#64748B', transition: 'all 0.15s' }),
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' } as React.CSSProperties,
    cardTitle: { fontSize: '13px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '16px' } as React.CSSProperties,
    kpi: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '18px 20px', textAlign: 'center' as const } as React.CSSProperties,
    kpiValue: { fontSize: '28px', fontWeight: 800, color: '#F1F5F9' } as React.CSSProperties,
    kpiLabel: { fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginTop: '4px' } as React.CSSProperties,
    btn: (primary = true): React.CSSProperties => ({ padding: '9px 18px', background: primary ? '#6366F1' : 'transparent', color: primary ? '#fff' : '#94A3B8', border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }),
    btnSm: (primary = true): React.CSSProperties => ({ padding: '5px 12px', background: primary ? '#6366F1' : 'transparent', color: primary ? '#fff' : '#94A3B8', border: primary ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }),
    badge: (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: color + '22', color }),
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 } as React.CSSProperties,
    modalCard: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '500px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '6px' } as React.CSSProperties,
    input: { width: '100%', padding: '10px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' as const, background: '#060B18', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', borderRadius: '6px' } as React.CSSProperties,
    textarea: { width: '100%', padding: '10px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' as const, background: '#060B18', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', borderRadius: '6px', height: '70px', resize: 'vertical' as const } as React.CSSProperties,
    formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const } as React.CSSProperties,
    th: { textAlign: 'left' as const, padding: '10px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    td: { padding: '12px', fontSize: '13px', color: '#CBD5E1', borderBottom: '1px solid rgba(255,255,255,0.04)' } as React.CSSProperties,
    empty: { padding: '60px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' } as React.CSSProperties,
    aiBox: { background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '20px', marginTop: '20px' } as React.CSSProperties,
    aiTitle: { fontSize: '14px', fontWeight: 700, color: '#818CF8', marginBottom: '12px' } as React.CSSProperties,
    progressBar: (val: number): React.CSSProperties => ({ width: `${val}%`, height: '6px', borderRadius: '3px', background: val >= 70 ? '#10B981' : val >= 40 ? '#F59E0B' : '#EF4444', transition: 'width 0.3s' }),
  }

  if (loading) return <div style={s.page}><div style={s.empty}>Loading market intelligence...</div></div>

  /* ------------------------------------------------------------------ */
  /*  TAB 0 — Dashboard                                                 */
  /* ------------------------------------------------------------------ */
  function OverviewTab() {
    return (
      <div>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={s.kpi}>
            <div style={s.kpiValue}>{signals.length}</div>
            <div style={s.kpiLabel}>Active Signals</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: avgTrendScore >= 60 ? '#10B981' : avgTrendScore >= 40 ? '#F59E0B' : '#EF4444' }}>{avgTrendScore}</div>
            <div style={s.kpiLabel}>Avg Trend Score</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: todayAlerts.length > 0 ? '#F59E0B' : '#F1F5F9' }}>{todayAlerts.length}</div>
            <div style={s.kpiLabel}>Alerts Today</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiValue}>{competitors.length}</div>
            <div style={s.kpiLabel}>Competitors Tracked</div>
          </div>
          <div style={s.kpi}>
            <div style={s.kpiValue}>{keywords.length}</div>
            <div style={s.kpiLabel}>Keywords Monitored</div>
          </div>
        </div>

        {/* Trend Chart */}
        <div style={{ ...s.card, marginBottom: '20px' }}>
          <div style={s.cardTitle}>30-Day Market Activity</div>
          <TrendChart />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Recent Signals */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={s.cardTitle}>Recent Signals</div>
              <button style={s.btnSm()} onClick={() => { setTab(0); setShowSignalForm(true) }}>+ Add</button>
            </div>
            {signals.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '12px' }}>No signals yet</div>
            ) : signals.slice(0, 8).map(sig => (
              <div key={sig.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>{sig.title}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>Score: {sig.score} {sig.category && `| ${sig.category}`}</div>
                </div>
                <span style={s.badge(RELEVANCE_COLOR[sig.relevance] || '#475569')}>{sig.relevance}</span>
              </div>
            ))}
          </div>

          {/* Unread Alerts */}
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={s.cardTitle}>Unread Alerts ({unreadAlerts.length})</div>
              {unreadAlerts.length > 0 && (
                <button style={s.btnSm(false)} onClick={() => markAlertsRead(unreadAlerts.map(a => a.id))}>Mark All Read</button>
              )}
            </div>
            {unreadAlerts.length === 0 ? (
              <div style={{ color: '#475569', fontSize: '12px' }}>No unread alerts</div>
            ) : unreadAlerts.slice(0, 8).map(alert => (
              <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={s.badge(ALERT_TYPE_COLOR[alert.alert_type] || '#475569')}>{alert.alert_type}</span>
                    <span style={{ fontSize: '13px', color: '#CBD5E1' }}>{alert.title}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{new Date(alert.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={s.btnSm(false)} onClick={() => markAlertsRead([alert.id])}>Read</button>
                  <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444440' }} onClick={() => dismissAlerts([alert.id])}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  TAB 1 — Trend Analysis                                            */
  /* ------------------------------------------------------------------ */
  function TrendsTab() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F5F9' }}>Trend Signals</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Market signals with relevance scoring and AI analysis</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={s.btn(false)} onClick={analyzeTrends} disabled={analyzing}>
              {analyzing ? 'Analyzing...' : 'AI Trend Analysis'}
            </button>
            <button style={s.btn()} onClick={() => setShowSignalForm(true)}>+ Add Signal</button>
          </div>
        </div>

        {/* Trend Chart */}
        <div style={{ ...s.card, marginBottom: '20px' }}>
          <div style={s.cardTitle}>30-Day Trend Activity</div>
          <TrendChart />
        </div>

        {/* Signals Table */}
        <div style={{ ...s.card, marginBottom: '20px', padding: '0', overflow: 'hidden' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Signal</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Relevance</th>
                <th style={s.th}>Score</th>
                <th style={s.th}>Tags</th>
                <th style={s.th}>Last Seen</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {signals.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: '32px', color: '#475569' }}>No trend signals recorded. Add signals or run AI analysis to populate.</td></tr>
              ) : signals.map(sig => (
                <tr key={sig.id}>
                  <td style={{ ...s.td, maxWidth: '280px' }}>
                    <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '13px' }}>{sig.title}</div>
                    {sig.summary && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{sig.summary}</div>}
                  </td>
                  <td style={s.td}><span style={s.badge('#6366F1')}>{sig.category || 'General'}</span></td>
                  <td style={s.td}><span style={s.badge(RELEVANCE_COLOR[sig.relevance] || '#475569')}>{sig.relevance}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                        <div style={s.progressBar(sig.score)} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: sig.score >= 70 ? '#10B981' : sig.score >= 40 ? '#F59E0B' : '#EF4444' }}>{sig.score}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      {(sig.tags || []).slice(0, 3).map((t, i) => (
                        <span key={i} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.08)', color: '#818CF8' }}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td style={s.td}>{new Date(sig.last_seen_at).toLocaleDateString()}</td>
                  <td style={s.td}>
                    <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444430' }} onClick={() => deleteItem('signal', sig.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Trend Analysis */}
        {analyzing && (
          <div style={s.aiBox}>
            <div style={s.aiTitle}>Generating AI Trend Analysis...</div>
            <div style={{ color: '#64748B', fontSize: '13px' }}>Analyzing keywords and market signals with AI...</div>
          </div>
        )}
        {trendAnalysis && !analyzing && (
          <div style={s.aiBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={s.aiTitle}>AI Trend Analysis</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={s.badge(trendAnalysis.trend_direction === 'up' ? '#10B981' : trendAnalysis.trend_direction === 'down' ? '#EF4444' : '#F59E0B')}>
                  {trendAnalysis.trend_direction === 'up' ? 'Trending Up' : trendAnalysis.trend_direction === 'down' ? 'Trending Down' : trendAnalysis.trend_direction === 'stable' ? 'Stable' : 'Mixed'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Confidence: {trendAnalysis.confidence_score}%</span>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.7, marginBottom: '16px' }}>{trendAnalysis.summary}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Opportunities</div>
                {trendAnalysis.opportunities.map((o, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #10B98140' }}>{o}</div>)}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risks</div>
                {trendAnalysis.risks.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #EF444440' }}>{r}</div>)}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommendations</div>
                {trendAnalysis.recommendations.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #6366F140' }}>{r}</div>)}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  TAB 2 — Competitor Watch                                          */
  /* ------------------------------------------------------------------ */
  function CompetitorTab() {
    const compAlerts = alerts.filter(a => a.alert_type === 'competitor')

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F5F9' }}>Competitor Intelligence</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Track competitors, analyze threats, and monitor market positioning</div>
          </div>
          <button style={s.btn()} onClick={() => setShowCompForm(true)}>+ Add Competitor</button>
        </div>

        {/* Competitor KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={s.kpi}>
            <div style={s.kpiValue}>{competitors.length}</div>
            <div style={s.kpiLabel}>Tracked</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: '#F59E0B' }}>{compAlerts.filter(a => !a.is_read).length}</div>
            <div style={s.kpiLabel}>Active Alerts</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: '#10B981' }}>{competitors.filter(c => c.last_checked_at && (Date.now() - new Date(c.last_checked_at).getTime()) < 7 * 86400000).length}</div>
            <div style={s.kpiLabel}>Checked This Week</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: '#8B5CF6' }}>{competitors.reduce((a, c) => a + (c.tracking_keywords?.length || 0), 0)}</div>
            <div style={s.kpiLabel}>Keywords Tracked</div>
          </div>
        </div>

        {competitors.length === 0 ? (
          <div style={{ ...s.card, ...s.empty }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>No competitors tracked yet</div>
            <div style={{ color: '#475569', fontSize: '12px', marginBottom: '16px' }}>Add competitors to monitor their market activity</div>
            <button style={s.btn()} onClick={() => setShowCompForm(true)}>+ Add First Competitor</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {competitors.map(comp => (
              <div key={comp.id} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>{comp.name}</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>
                      {comp.website && <span>Website: <a href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#818CF8' }}>{comp.website}</a></span>}
                      {comp.industry && <span>Industry: <strong style={{ color: '#94A3B8' }}>{comp.industry}</strong></span>}
                      {comp.last_checked_at && <span>Last checked: {new Date(comp.last_checked_at).toLocaleDateString()}</span>}
                    </div>
                    {comp.tracking_keywords && comp.tracking_keywords.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {comp.tracking_keywords.map(kw => (
                          <span key={kw} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)', color: '#818CF8', fontSize: '11px' }}>{kw}</span>
                        ))}
                      </div>
                    )}
                    {comp.notes && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{comp.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button style={s.btnSm()} onClick={() => analyzeCompetitor(comp)} disabled={analyzing}>
                      {analyzing && compAnalysis?.id === comp.id ? 'Analyzing...' : 'AI Analyze'}
                    </button>
                    <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444430' }} onClick={() => deleteItem('competitor', comp.id)}>Remove</button>
                  </div>
                </div>

                {/* Competitor AI Analysis */}
                {compAnalysis && compAnalysis.id === comp.id && (
                  <div style={{ ...s.aiBox, marginTop: '16px' }}>
                    <div style={s.aiTitle}>AI Competitive Analysis: {comp.name}</div>
                    <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.7, marginBottom: '16px' }}>{compAnalysis.data.overview}</div>
                    <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '12px' }}>
                      <strong style={{ color: '#818CF8' }}>Market Positioning:</strong> {compAnalysis.data.market_positioning}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', marginBottom: '8px' }}>STRENGTHS</div>
                        {compAnalysis.data.strengths.map((s2, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #10B98140' }}>{s2}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', marginBottom: '8px' }}>WEAKNESSES</div>
                        {compAnalysis.data.weaknesses.map((w, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #EF444440' }}>{w}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', marginBottom: '8px' }}>THREATS THEY POSE</div>
                        {compAnalysis.data.threats.map((t2, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #F59E0B40' }}>{t2}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6', marginBottom: '8px' }}>OPPORTUNITIES</div>
                        {compAnalysis.data.opportunities.map((o, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #3B82F640' }}>{o}</div>)}
                      </div>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', marginBottom: '8px' }}>RECOMMENDED ACTIONS</div>
                      {compAnalysis.data.recommended_actions.map((a, i) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #6366F140' }}>{a}</div>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Comparison Grid */}
        {competitors.length >= 2 && (
          <div style={{ ...s.card, marginTop: '20px', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={s.cardTitle}>Competitor Comparison</div>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Competitor</th>
                  <th style={s.th}>Industry</th>
                  <th style={s.th}>Website</th>
                  <th style={s.th}>Keywords Tracked</th>
                  <th style={s.th}>Added</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...s.td, fontWeight: 600, color: '#F1F5F9' }}>{c.name}</td>
                    <td style={s.td}>{c.industry || '--'}</td>
                    <td style={s.td}>{c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#818CF8', fontSize: '12px' }}>{c.website}</a> : '--'}</td>
                    <td style={s.td}>{(c.tracking_keywords || []).length}</td>
                    <td style={s.td}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  TAB 3 — Alerts                                                    */
  /* ------------------------------------------------------------------ */
  function KeywordsTab() {
    const toggleSelect = (id: string) => {
      setSelectedAlerts(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      })
    }

    // Keyword-related alerts
    const kwAlerts = alerts.filter(a => a.alert_type === 'keyword')

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F5F9' }}>Keyword Monitoring</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Track keywords, set alert thresholds, and monitor search volume trends</div>
          </div>
          <button style={s.btn()} onClick={() => setShowKwForm(true)}>+ Add Keyword</button>
        </div>

        {/* KPI Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={s.kpi}>
            <div style={s.kpiValue}>{keywords.length}</div>
            <div style={s.kpiLabel}>Keywords Tracked</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: avgTrendScore >= 60 ? '#10B981' : avgTrendScore >= 40 ? '#F59E0B' : '#EF4444' }}>{avgTrendScore}</div>
            <div style={s.kpiLabel}>Avg Trend Score</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: '#10B981' }}>{keywords.filter(k => (k.volume_change_pct ?? 0) > 0).length}</div>
            <div style={s.kpiLabel}>Trending Up</div>
          </div>
          <div style={s.kpi}>
            <div style={{ ...s.kpiValue, color: '#F59E0B' }}>{kwAlerts.filter(a => !a.is_read).length}</div>
            <div style={s.kpiLabel}>Active Alerts</div>
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: '#64748B' }}>Category:</span>
          {['all', ...KEYWORD_CATEGORIES].map(cat => (
            <button key={cat} style={s.tab(kwCategoryFilter === cat)} onClick={() => setKwCategoryFilter(cat)}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        {/* Keyword Table */}
        <div style={{ ...s.card, marginBottom: '20px', padding: '0', overflow: 'hidden' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Keyword</th>
                <th style={s.th}>Category</th>
                <th style={s.th}>Trend Score</th>
                <th style={s.th}>Volume Change</th>
                <th style={s.th}>Alert Status</th>
                <th style={s.th}>Last Updated</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {filteredKeywords.length === 0 ? (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', padding: '32px', color: '#475569' }}>No keywords tracked. Add one to start monitoring.</td></tr>
              ) : filteredKeywords.map(kw => (
                <tr key={kw.id}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#F1F5F9' }}>{kw.keyword}</td>
                  <td style={s.td}><span style={s.badge('#6366F1')}>{kw.category || 'General'}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                        <div style={s.progressBar(kw.trend_score)} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: kw.trend_score >= 70 ? '#10B981' : kw.trend_score >= 40 ? '#F59E0B' : '#EF4444' }}>{kw.trend_score}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    {kw.volume_change_pct != null ? (
                      <span style={{ fontWeight: 600, color: kw.volume_change_pct > 0 ? '#10B981' : kw.volume_change_pct < 0 ? '#EF4444' : '#64748B' }}>
                        {kw.volume_change_pct > 0 ? '+' : ''}{Number(kw.volume_change_pct).toFixed(1)}%
                      </span>
                    ) : <span style={{ color: '#334155' }}>--</span>}
                  </td>
                  <td style={s.td}>
                    {kw.trend_score >= 70 ? (
                      <span style={s.badge('#10B981')}>Hot</span>
                    ) : kw.trend_score >= 40 ? (
                      <span style={s.badge('#F59E0B')}>Warm</span>
                    ) : (
                      <span style={s.badge('#475569')}>Normal</span>
                    )}
                  </td>
                  <td style={s.td}>{new Date(kw.last_updated).toLocaleDateString()}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button style={s.btnSm(false)} onClick={() => {
                        // Create a keyword alert
                        fetch('/api/market-watch/alerts', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: `Alert: ${kw.keyword} trend score ${kw.trend_score}`, description: `Keyword "${kw.keyword}" currently at trend score ${kw.trend_score}/100 with ${kw.volume_change_pct ?? 0}% volume change.`, alert_type: 'keyword', severity: kw.trend_score >= 70 ? 'warning' : 'info' }),
                        }).then(() => load())
                      }}>Alert</button>
                      <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444430' }} onClick={() => deleteItem('keyword', kw.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Keyword Alerts Section */}
        <div style={{ ...s.card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={s.cardTitle}>Keyword Alerts ({kwAlerts.length})</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {kwAlerts.filter(a => !a.is_read).length > 0 && (
                <button style={s.btnSm(false)} onClick={() => markAlertsRead(kwAlerts.filter(a => !a.is_read).map(a => a.id))}>Mark All Read</button>
              )}
              <button style={s.btnSm()} onClick={() => setShowAlertForm(true)}>+ Manual Alert</button>
            </div>
          </div>
          {kwAlerts.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '12px', padding: '20px', textAlign: 'center' }}>No keyword alerts yet. Click "Alert" on a keyword row to create one, or add keywords with monitoring enabled.</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {kwAlerts.slice(0, 15).map(alert => (
                <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: alert.is_read ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                    <span style={s.badge(SEVERITY_COLOR[alert.severity] || '#475569')}>{alert.severity}</span>
                    <span style={{ fontSize: '13px', color: '#F1F5F9', fontWeight: 600 }}>{alert.title}</span>
                    <span style={{ fontSize: '11px', color: '#475569' }}>{new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!alert.is_read && <button style={s.btnSm(false)} onClick={() => markAlertsRead([alert.id])}>Read</button>}
                    <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444430' }} onClick={() => dismissAlerts([alert.id])}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Alerts Section (non-keyword) */}
        {alerts.filter(a => a.alert_type !== 'keyword').length > 0 && (
          <div style={{ ...s.card, marginTop: '20px' }}>
            <div style={s.cardTitle}>Other Market Alerts ({alerts.filter(a => a.alert_type !== 'keyword').length})</div>
            <div style={{ display: 'grid', gap: '6px' }}>
              {alerts.filter(a => a.alert_type !== 'keyword').slice(0, 10).map(alert => (
                <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: alert.is_read ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <span style={s.badge(ALERT_TYPE_COLOR[alert.alert_type] || '#475569')}>{alert.alert_type}</span>
                    <span style={{ fontSize: '13px', color: '#CBD5E1' }}>{alert.title}</span>
                    <span style={s.badge(SEVERITY_COLOR[alert.severity] || '#475569')}>{alert.severity}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!alert.is_read && <button style={s.btnSm(false)} onClick={() => markAlertsRead([alert.id])}>Read</button>}
                    <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444430' }} onClick={() => dismissAlerts([alert.id])}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  TAB 4 — Intelligence Reports                                      */
  /* ------------------------------------------------------------------ */
  function ReportsTab() {
    const reportToView = viewingReport ? (viewingReport.sections || JSON.parse(viewingReport.content || '{}')) : latestReport

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F5F9' }}>Intelligence Reports</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>AI-generated comprehensive market intelligence reports</div>
          </div>
          <button style={s.btn()} onClick={generateReport} disabled={generatingReport}>
            {generatingReport ? 'Generating Report...' : 'Generate Market Report'}
          </button>
        </div>

        {generatingReport && (
          <div style={s.aiBox}>
            <div style={s.aiTitle}>Generating Comprehensive Report...</div>
            <div style={{ color: '#64748B', fontSize: '13px' }}>AI is analyzing all signals, keywords, competitors, and alerts to produce a full intelligence report. This may take a moment...</div>
          </div>
        )}

        {/* Report Display */}
        {reportToView && !generatingReport && (
          <div style={{ ...s.aiBox, marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#818CF8' }}>{reportToView.title || 'Market Intelligence Report'}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {viewingReport && <button style={s.btnSm(false)} onClick={() => setViewingReport(null)}>Close</button>}
                <button style={s.btnSm(false)} onClick={() => {
                  const text = JSON.stringify(reportToView, null, 2)
                  const blob = new Blob([text], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = `market-report-${new Date().toISOString().split('T')[0]}.txt`
                  a.click(); URL.revokeObjectURL(url)
                }}>Download</button>
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Executive Summary</div>
              <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.8 }}>{reportToView.executive_summary}</div>
            </div>

            {/* Market Trends */}
            {reportToView.market_trends && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Market Trends
                  {reportToView.market_trends.trend_direction && (
                    <span style={{ ...s.badge(reportToView.market_trends.trend_direction === 'up' ? '#10B981' : reportToView.market_trends.trend_direction === 'down' ? '#EF4444' : '#F59E0B'), marginLeft: '8px' }}>
                      {reportToView.market_trends.trend_direction}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.7, marginBottom: '10px' }}>{reportToView.market_trends.overview}</div>
                {reportToView.market_trends.key_trends?.map((t: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #10B98140' }}>{t}</div>
                ))}
              </div>
            )}

            {/* Competitive Landscape */}
            {reportToView.competitive_landscape && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Competitive Landscape</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.7, marginBottom: '10px' }}>{reportToView.competitive_landscape.overview}</div>
                {reportToView.competitive_landscape.key_findings?.map((f: string, i: number) => (
                  <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '5px', paddingLeft: '10px', borderLeft: '2px solid #8B5CF640' }}>{f}</div>
                ))}
              </div>
            )}

            {/* Keyword Analysis */}
            {reportToView.keyword_analysis && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Keyword Analysis</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.7, marginBottom: '10px' }}>{reportToView.keyword_analysis.overview}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {reportToView.keyword_analysis.hot_keywords?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', marginBottom: '6px' }}>HOT KEYWORDS</div>
                      {reportToView.keyword_analysis.hot_keywords.map((k: string, i: number) => (
                        <span key={i} style={{ ...s.badge('#10B981'), marginRight: '4px', marginBottom: '4px' }}>{k}</span>
                      ))}
                    </div>
                  )}
                  {reportToView.keyword_analysis.declining_keywords?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', marginBottom: '6px' }}>DECLINING KEYWORDS</div>
                      {reportToView.keyword_analysis.declining_keywords.map((k: string, i: number) => (
                        <span key={i} style={{ ...s.badge('#EF4444'), marginRight: '4px', marginBottom: '4px' }}>{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opportunities, Risks, Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {reportToView.opportunities?.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', marginBottom: '8px', textTransform: 'uppercase' }}>Opportunities</div>
                  {reportToView.opportunities.map((o: string, i: number) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #10B98140' }}>{o}</div>)}
                </div>
              )}
              {reportToView.risks?.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', marginBottom: '8px', textTransform: 'uppercase' }}>Risks</div>
                  {reportToView.risks.map((r: string, i: number) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #EF444440' }}>{r}</div>)}
                </div>
              )}
              {reportToView.recommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', marginBottom: '8px', textTransform: 'uppercase' }}>Recommendations</div>
                  {reportToView.recommendations.map((r: string, i: number) => <div key={i} style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px', paddingLeft: '10px', borderLeft: '2px solid #6366F140' }}>{r}</div>)}
                </div>
              )}
            </div>

            {/* Outlook */}
            {reportToView.outlook && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px 16px', marginTop: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', marginBottom: '6px', textTransform: 'uppercase' }}>Market Outlook</div>
                <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.7 }}>{reportToView.outlook}</div>
              </div>
            )}
          </div>
        )}

        {/* Report History */}
        <div style={s.card}>
          <div style={s.cardTitle}>Report History</div>
          {reports.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '12px' }}>No reports generated yet. Click "Generate Market Report" to create your first intelligence report.</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {reports.map(rep => (
                <div key={rep.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>{rep.title}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(rep.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnSm()} onClick={() => setViewingReport(rep)}>View</button>
                    <button style={s.btnSm(false)} onClick={() => {
                      const text = rep.content || JSON.stringify(rep.sections, null, 2)
                      const blob = new Blob([text], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url; a.download = `${rep.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`
                      a.click(); URL.revokeObjectURL(url)
                    }}>Download</button>
                    <button style={{ ...s.btnSm(false), color: '#EF4444', borderColor: '#EF444430' }} onClick={() => deleteItem('report', rep.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={s.h1}>Market Watch</h1>
          <p style={s.sub}>Market intelligence, trend analysis, competitor monitoring, and AI-powered insights</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map((t, i) => (
          <button key={t} style={{ ...s.tab(tab === i), display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setTab(i)}>
            {t}
            {i === 3 && unreadAlerts.length > 0 && (
              <span style={{ fontSize: '10px', fontWeight: 700, background: '#EF4444', color: '#fff', borderRadius: '999px', padding: '1px 6px', lineHeight: '14px' }}>{unreadAlerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 0 && <OverviewTab />}
      {tab === 1 && <TrendsTab />}
      {tab === 2 && <CompetitorTab />}
      {tab === 3 && <KeywordsTab />}
      {tab === 4 && <ReportsTab />}

      {/* ------ MODALS ------ */}

      {/* Add Signal Modal */}
      {showSignalForm && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowSignalForm(false)}>
          <div style={s.modalCard}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' }}>Add Market Signal</div>
            <label style={s.label}>Topic / Signal *</label>
            <input style={s.input} placeholder="e.g. Rising demand for mini-split systems" value={sigForm.title} onChange={e => setSigForm(f => ({ ...f, title: e.target.value }))} />
            <label style={s.label}>Summary</label>
            <textarea style={s.textarea} placeholder="What's the trend and why does it matter?" value={sigForm.summary} onChange={e => setSigForm(f => ({ ...f, summary: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div>
                <label style={s.label}>Category</label>
                <input style={s.input} placeholder="Technology, Services..." value={sigForm.category} onChange={e => setSigForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Relevance</label>
                <select style={s.input} value={sigForm.relevance} onChange={e => setSigForm(f => ({ ...f, relevance: e.target.value }))}>
                  {['low', 'medium', 'high', 'urgent'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <label style={s.label}>Tags (comma-separated)</label>
            <input style={s.input} placeholder="ai, saas, construction" value={sigForm.tags} onChange={e => setSigForm(f => ({ ...f, tags: e.target.value }))} />
            <label style={s.label}>Action Note (optional)</label>
            <input style={s.input} placeholder="What should the team do with this signal?" value={sigForm.action_note} onChange={e => setSigForm(f => ({ ...f, action_note: e.target.value }))} />
            <div style={s.formActions}>
              <button style={s.btn(false)} onClick={() => setShowSignalForm(false)}>Cancel</button>
              <button style={s.btn()} onClick={addSignal} disabled={saving}>{saving ? 'Saving...' : 'Add Signal'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Competitor Modal */}
      {showCompForm && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowCompForm(false)}>
          <div style={s.modalCard}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' }}>Add Competitor</div>
            <label style={s.label}>Company Name *</label>
            <input style={s.input} placeholder="e.g. Acme Corp" value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div>
                <label style={s.label}>Website</label>
                <input style={s.input} placeholder="acmecorp.com" value={compForm.website} onChange={e => setCompForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Industry</label>
                <input style={s.input} placeholder="Technology, HVAC, Construction..." value={compForm.industry} onChange={e => setCompForm(f => ({ ...f, industry: e.target.value }))} />
              </div>
            </div>
            <label style={s.label}>Tracking Keywords (comma-separated)</label>
            <input style={s.input} placeholder="keyword1, keyword2, keyword3" value={compForm.tracking_keywords} onChange={e => setCompForm(f => ({ ...f, tracking_keywords: e.target.value }))} />
            <label style={s.label}>Notes</label>
            <textarea style={s.textarea} placeholder="What do you know about this competitor? Their strengths, weaknesses, market approach..." value={compForm.notes} onChange={e => setCompForm(f => ({ ...f, notes: e.target.value }))} />
            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>After adding, use "AI Analyze" to generate a competitive analysis including strengths, weaknesses, threats, and recommended actions.</div>
            </div>
            <div style={s.formActions}>
              <button style={s.btn(false)} onClick={() => setShowCompForm(false)}>Cancel</button>
              <button style={s.btn()} onClick={addCompetitor} disabled={saving}>{saving ? 'Saving...' : 'Add Competitor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Keyword Modal */}
      {showKwForm && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowKwForm(false)}>
          <div style={s.modalCard}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' }}>Add Keyword to Monitor</div>
            <label style={s.label}>Keyword *</label>
            <input style={s.input} placeholder="e.g. smart building automation" value={kwForm.keyword} onChange={e => setKwForm(f => ({ ...f, keyword: e.target.value }))} />
            <label style={s.label}>Category</label>
            <select style={s.input} value={kwForm.category} onChange={e => setKwForm(f => ({ ...f, category: e.target.value }))}>
              {KEYWORD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Alert Configuration */}
            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input type="checkbox" id="alert_enabled" checked={kwForm.alert_enabled}
                  onChange={e => setKwForm(f => ({ ...f, alert_enabled: e.target.checked }))} />
                <label htmlFor="alert_enabled" style={{ fontSize: '13px', color: '#F1F5F9', fontWeight: 600, cursor: 'pointer' }}>Enable Alert Monitoring</label>
              </div>
              {kwForm.alert_enabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={s.label}>Alert When Score Exceeds</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input style={{ ...s.input, marginBottom: 0 }} type="number" min="0" max="100"
                        value={kwForm.alert_threshold} onChange={e => setKwForm(f => ({ ...f, alert_threshold: Number(e.target.value) }))} />
                      <span style={{ fontSize: '12px', color: '#64748B' }}>/100</span>
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Alert Frequency</label>
                    <select style={{ ...s.input, marginBottom: 0 }} value={kwForm.alert_frequency}
                      onChange={e => setKwForm(f => ({ ...f, alert_frequency: e.target.value }))}>
                      <option value="immediate">Immediate</option>
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly Summary</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={s.formActions}>
              <button style={s.btn(false)} onClick={() => setShowKwForm(false)}>Cancel</button>
              <button style={s.btn()} onClick={addKeyword} disabled={saving}>{saving ? 'Saving...' : 'Add Keyword'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Alert Modal */}
      {showAlertForm && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowAlertForm(false)}>
          <div style={s.modalCard}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' }}>Create Manual Alert</div>
            <label style={s.label}>Title *</label>
            <input style={s.input} placeholder="Alert title" value={alertForm.title} onChange={e => setAlertForm(f => ({ ...f, title: e.target.value }))} />
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} placeholder="Describe the alert..." value={alertForm.description} onChange={e => setAlertForm(f => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div>
                <label style={s.label}>Type</label>
                <select style={s.input} value={alertForm.alert_type} onChange={e => setAlertForm(f => ({ ...f, alert_type: e.target.value }))}>
                  {ALERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Severity</label>
                <select style={s.input} value={alertForm.severity} onChange={e => setAlertForm(f => ({ ...f, severity: e.target.value }))}>
                  {SEVERITIES.map(sv => <option key={sv} value={sv}>{sv}</option>)}
                </select>
              </div>
            </div>
            <div style={s.formActions}>
              <button style={s.btn(false)} onClick={() => setShowAlertForm(false)}>Cancel</button>
              <button style={s.btn()} onClick={addAlert} disabled={saving}>{saving ? 'Saving...' : 'Create Alert'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
