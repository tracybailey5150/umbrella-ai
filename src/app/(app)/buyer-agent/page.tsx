'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

/* ── Types ── */
type Config = {
  id: string; name: string; category: string; description: string | null
  budget_min: number | null; budget_max: number | null; location: string | null
  requirements: { key: string; value: string }[]
  search_sources: string[]; alert_email: string | null; schedule: string
  auto_follow_up: boolean; is_active: boolean; match_count: number
  last_run_at: string | null; search_history: { ran_at: string; results: number }[]
  created_at: string
}

type Match = {
  id: string; config_id: string; title: string; description: string | null
  match_score: number; match_reasons: string[]; source: string | null
  source_url: string | null; price: number | null; location: string | null
  image_url: string | null; status: string; notes: string | null; created_at: string
}

/* ── Constants ── */
const CATEGORIES = ['vehicles', 'real_estate', 'equipment', 'electronics', 'musical_instruments', 'services', 'general']
const CAT_LABELS: Record<string, string> = {
  vehicles: 'Vehicles', real_estate: 'Real Estate', equipment: 'Equipment',
  electronics: 'Electronics', musical_instruments: 'Musical Instruments',
  services: 'Services', general: 'General',
}
const CAT_ICONS: Record<string, string> = {
  vehicles: '\u{1F697}', real_estate: '\u{1F3E0}', equipment: '\u2699\uFE0F',
  electronics: '\u{1F4BB}', musical_instruments: '\u{1F3B8}',
  services: '\u{1F6E0}\uFE0F', general: '\u{1F50D}',
  // Legacy mapping
  property: '\u{1F3E0}', vehicle: '\u{1F697}', technology: '\u{1F4BB}',
  materials: '\u{1F4E6}', other: '\u{1F50D}',
}
const SOURCES = ['marketplace', 'listings', 'inventory', 'auction', 'dealer', 'custom']
const SCHEDULES = ['continuous', 'hourly', 'daily', 'weekly']
const ALERT_FREQ = ['immediate', 'daily', 'weekly']

const blank = {
  name: '', category: 'equipment', description: '',
  budget_min: '', budget_max: '', location: '',
  keywords: '',
  requirements: [{ key: '', value: '' }],
  search_sources: ['marketplace', 'listings', 'inventory'],
  alert_email: '', schedule: 'daily', alert_frequency: 'daily',
  auto_follow_up: true,
}

/* ── Helpers ── */
function scoreColor(s: number) { return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444' }
function ago(d: string) {
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function BuyerAgentPage() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof blank>({ ...blank })
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [matchFilter, setMatchFilter] = useState('all')
  const [matchSort, setMatchSort] = useState<'score' | 'price' | 'date'>('score')
  const [noteText, setNoteText] = useState('')

  /* ── Data Loading ── */
  const loadConfigs = useCallback(async () => {
    const res = await fetch('/api/buyer-agent')
    const json = await res.json()
    setConfigs(json.data || [])
  }, [])

  const loadMatches = useCallback(async (configId?: string) => {
    const url = configId
      ? `/api/buyer-agent/matches?configId=${configId}`
      : '/api/buyer-agent/matches'
    const res = await fetch(url)
    const json = await res.json()
    setMatches(json.data || [])
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      await loadConfigs()
      await loadMatches()
      setLoading(false)
    }
    init()
  }, [loadConfigs, loadMatches])

  useEffect(() => {
    if (activeId) loadMatches(activeId)
  }, [activeId, loadMatches])

  /* ── Actions ── */
  async function handleSave() {
    setSaving(true)
    // Store keywords in requirements as a special entry
    const reqs = form.requirements.filter(r => r.key && r.value)
    if (form.keywords.trim()) {
      reqs.push({ key: '_keywords', value: form.keywords.trim() })
    }
    const payload: any = {
      name: form.name, category: form.category, description: form.description || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      location: form.location || null,
      requirements: reqs,
      search_sources: form.search_sources,
      alert_email: form.alert_email || null,
      schedule: form.schedule,
      auto_follow_up: form.auto_follow_up,
    }
    if (editId) {
      payload.id = editId
      await fetch('/api/buyer-agent', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/buyer-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false); setShowForm(false); setEditId(null); setForm({ ...blank })
    await loadConfigs()
  }

  function openEdit(c: Config) {
    setEditId(c.id)
    // Extract keywords from requirements if stored there
    const kwReq = c.requirements?.find((r: any) => r.key === '_keywords')
    const kwStr = kwReq ? kwReq.value : ''
    setForm({
      name: c.name, category: c.category, description: c.description || '',
      budget_min: c.budget_min?.toString() || '', budget_max: c.budget_max?.toString() || '',
      location: c.location || '',
      keywords: kwStr,
      requirements: (c.requirements || []).filter((r: any) => r.key !== '_keywords').length ? (c.requirements || []).filter((r: any) => r.key !== '_keywords') : [{ key: '', value: '' }],
      search_sources: c.search_sources || ['marketplace', 'listings', 'inventory'],
      alert_email: c.alert_email || '', schedule: c.schedule || 'daily',
      alert_frequency: 'daily', auto_follow_up: c.auto_follow_up,
    })
    setShowForm(true)
  }

  async function handleToggle(id: string, is_active: boolean) {
    await fetch('/api/buyer-agent', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) })
    setConfigs(c => c.map(x => x.id === id ? { ...x, is_active } : x))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/buyer-agent?id=${id}`, { method: 'DELETE' })
    if (activeId === id) { setActiveId(null); setMatches([]) }
    await loadConfigs()
  }

  async function handleRunSearch() {
    if (!activeId) return
    setRunning(true); setRunError(null)
    try {
      const res = await fetch('/api/buyer-agent/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: activeId }),
      })
      const json = await res.json()
      if (json.error) { setRunError(json.error) }
      else { await loadMatches(activeId); await loadConfigs() }
    } catch (e: any) { setRunError(e.message) }
    setRunning(false)
  }

  async function updateMatchStatus(id: string, status: string) {
    await fetch('/api/buyer-agent/matches', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setMatches(m => m.map(x => x.id === id ? { ...x, status } : x))
    if (selectedMatch?.id === id) setSelectedMatch(prev => prev ? { ...prev, status } : null)
  }

  async function saveNote(id: string) {
    await fetch('/api/buyer-agent/matches', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes: noteText }),
    })
    setMatches(m => m.map(x => x.id === id ? { ...x, notes: noteText } : x))
    if (selectedMatch?.id === id) setSelectedMatch(prev => prev ? { ...prev, notes: noteText } : null)
  }

  async function deleteMatch(id: string) {
    await fetch(`/api/buyer-agent/matches?id=${id}`, { method: 'DELETE' })
    setMatches(m => m.filter(x => x.id !== id))
    if (selectedMatch?.id === id) setSelectedMatch(null)
  }

  /* ── Computed ── */
  const activeConfig = configs.find(c => c.id === activeId) || null
  const today = new Date().toDateString()

  const filteredMatches = matches
    .filter(m => matchFilter === 'all' || m.status === matchFilter)
    .sort((a, b) => {
      if (matchSort === 'score') return b.match_score - a.match_score
      if (matchSort === 'price') return (a.price || 0) - (b.price || 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const stats = {
    activeSearches: configs.filter(c => c.is_active).length,
    totalMatches: matches.length,
    newToday: matches.filter(m => new Date(m.created_at).toDateString() === today).length,
    saved: matches.filter(m => m.status === 'saved').length,
  }

  /* ── Styles ── */
  const s = {
    page: { display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', background: '#060B18' } as React.CSSProperties,
    sidebar: { width: '320px', minWidth: '320px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    sideHead: { padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    sideList: { flex: 1, overflowY: 'auto', padding: '8px' } as React.CSSProperties,
    center: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    centerScroll: { flex: 1, overflowY: 'auto', padding: '24px 28px' } as React.CSSProperties,

    configCard: (active: boolean, isActive: boolean): React.CSSProperties => ({
      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', marginBottom: '6px',
      background: active ? 'rgba(99,102,241,0.08)' : '#0C1525',
      border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
      opacity: isActive ? 1 : 0.55, transition: 'all 0.15s',
    }),

    btn: (primary = true, small = false): React.CSSProperties => ({
      padding: small ? '5px 12px' : '9px 18px',
      background: primary ? '#6366F1' : 'transparent',
      color: primary ? '#fff' : '#94A3B8',
      border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: '7px', fontSize: small ? '12px' : '13px', fontWeight: 600,
      cursor: 'pointer', whiteSpace: 'nowrap',
    }),

    badge: (color: string): React.CSSProperties => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: '999px',
      fontSize: '11px', fontWeight: 600, background: color + '18', color,
    }),

    statCard: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px 20px', flex: 1, minWidth: '140px' } as React.CSSProperties,

    matchCard: (active: boolean): React.CSSProperties => ({
      background: active ? 'rgba(99,102,241,0.06)' : '#0C1525',
      border: `1px solid ${active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '10px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s',
    }),

    input: { width: '100%', background: '#060B18', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', borderRadius: '6px', padding: '9px 12px', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' as const } as React.CSSProperties,
    label: { fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '4px', display: 'block' } as React.CSSProperties,
    select: { width: '100%', background: '#060B18', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', borderRadius: '6px', padding: '9px 12px', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' as const } as React.CSSProperties,
  }

  if (loading) return (
    <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: '14px' }}>Loading Buyer Agent...</div>
    </div>
  )

  return (
    <div style={s.page}>
      {/* ── LEFT SIDEBAR: Config List ── */}
      <div style={s.sidebar}>
        <div style={s.sideHead}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>Buyer Agent</div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>AI-powered procurement search</div>
          <button style={{ ...s.btn(), width: '100%', textAlign: 'center' }} onClick={() => { setEditId(null); setForm({ ...blank }); setShowForm(true) }}>
            + New Search
          </button>
        </div>
        <div style={s.sideList as any}>
          {configs.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
              No searches yet. Create one to get started.
            </div>
          )}
          {configs.map(c => (
            <div key={c.id} style={s.configCard(c.id === activeId, c.is_active)} onClick={() => { setActiveId(c.id); setSelectedMatch(null) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {CAT_ICONS[c.category] || '\u{1F50D}'} {c.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{CAT_LABELS[c.category] || c.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {c.match_count > 0 && (
                    <span style={{ ...s.badge('#6366F1'), fontSize: '10px' }}>{c.match_count}</span>
                  )}
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, background: c.is_active ? '#10B98115' : '#47556915', color: c.is_active ? '#10B981' : '#475569' }}>
                    {c.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              {(c.budget_min || c.budget_max) && (
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                  ${c.budget_min?.toLocaleString() || '0'} - ${c.budget_max?.toLocaleString() || '\u221E'}
                </div>
              )}
              {c.location && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{c.location}</div>}
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                {c.last_run_at ? `Searched ${ago(c.last_run_at)}` : 'Never searched'}
                {c.schedule && ` \u00B7 ${c.schedule}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER PANEL ── */}
      <div style={s.center as any}>
        <div style={s.centerScroll as any}>
          {/* Stats Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Active Searches', value: stats.activeSearches, color: '#6366F1' },
              { label: 'Total Matches', value: stats.totalMatches, color: '#3B82F6' },
              { label: 'New Today', value: stats.newToday, color: '#10B981' },
              { label: 'Saved', value: stats.saved, color: '#F59E0B' },
            ].map(st => (
              <div key={st.label} style={s.statCard}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: st.color }}>{st.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</div>
              </div>
            ))}
          </div>

          {!activeConfig ? (
            /* No config selected */
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>{'\u{1F50D}'}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px' }}>
                {configs.length === 0 ? 'Create your first search' : 'Select a search from the sidebar'}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                Set up search criteria and the AI agent will find matching listings, equipment, properties, or services for you.
              </div>
            </div>
          ) : selectedMatch ? (
            /* ── Match Detail View ── */
            <div>
              <button onClick={() => setSelectedMatch(null)} style={{ ...s.btn(false, true), marginBottom: '16px' }}>
                {'\u2190'} Back to matches
              </button>
              <div style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9' }}>{selectedMatch.title}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {selectedMatch.source && <span style={{ fontSize: '12px', color: '#64748B' }}>{selectedMatch.source}</span>}
                      {selectedMatch.location && <span style={{ fontSize: '12px', color: '#64748B' }}>{selectedMatch.location}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: scoreColor(selectedMatch.match_score) }}>{selectedMatch.match_score}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Match Score</div>
                  </div>
                </div>

                {selectedMatch.price && (
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9', marginBottom: '16px' }}>
                    ${selectedMatch.price.toLocaleString()}
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ ...s.label, marginBottom: '8px' }}>Description</div>
                  <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.7' }}>
                    {selectedMatch.description || 'No description available.'}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ ...s.label, marginBottom: '8px' }}>Score Breakdown</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(selectedMatch.match_reasons || []).map((r, i) => (
                      <span key={i} style={{ ...s.badge('#6366F1'), padding: '4px 10px' }}>{r}</span>
                    ))}
                  </div>
                  {/* Criteria fit analysis */}
                  <div style={{ marginTop: '12px', padding: '12px', background: '#060B18', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Criteria Analysis</div>
                    {activeConfig?.budget_min || activeConfig?.budget_max ? (
                      <div style={{ fontSize: '12px', color: selectedMatch.price && activeConfig.budget_min && activeConfig.budget_max && selectedMatch.price >= activeConfig.budget_min && selectedMatch.price <= activeConfig.budget_max ? '#10B981' : '#F59E0B', marginBottom: '4px' }}>
                        {selectedMatch.price && activeConfig.budget_min && activeConfig.budget_max && selectedMatch.price >= activeConfig.budget_min && selectedMatch.price <= activeConfig.budget_max
                          ? '\u2713 Within budget range'
                          : '\u26A0 Budget may not align'}
                      </div>
                    ) : null}
                    {activeConfig?.location ? (
                      <div style={{ fontSize: '12px', color: selectedMatch.location?.toLowerCase().includes(activeConfig.location.toLowerCase()) ? '#10B981' : '#64748B', marginBottom: '4px' }}>
                        {selectedMatch.location?.toLowerCase().includes(activeConfig.location.toLowerCase())
                          ? `\u2713 Location matches: ${activeConfig.location}`
                          : `\u{1F4CD} Location: ${selectedMatch.location || 'Unknown'} (preferred: ${activeConfig.location})`}
                      </div>
                    ) : null}
                  </div>
                </div>

                {selectedMatch.source_url && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ ...s.label, marginBottom: '8px' }}>Source Link</div>
                    <a href={selectedMatch.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#6366F1', wordBreak: 'break-all' }}>
                      {selectedMatch.source_url}
                    </a>
                  </div>
                )}

                {/* Status */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ ...s.label, marginBottom: '8px' }}>Status</div>
                  <span style={s.badge(
                    selectedMatch.status === 'interested' ? '#10B981' :
                    selectedMatch.status === 'saved' ? '#3B82F6' :
                    selectedMatch.status === 'rejected' ? '#EF4444' : '#64748B'
                  )}>
                    {selectedMatch.status}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button style={s.btn(true, true)} onClick={() => updateMatchStatus(selectedMatch.id, 'interested')}>
                    {'\u2714'} Interested
                  </button>
                  <button style={{ ...s.btn(false, true), color: '#3B82F6', borderColor: 'rgba(59,130,246,0.3)' }} onClick={() => updateMatchStatus(selectedMatch.id, 'saved')}>
                    {'\u2606'} Save
                  </button>
                  <button style={{ ...s.btn(false, true), color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => updateMatchStatus(selectedMatch.id, 'rejected')}>
                    {'\u2716'} Reject
                  </button>
                  {selectedMatch.source_url && (
                    <a href={selectedMatch.source_url} target="_blank" rel="noopener noreferrer" style={{ ...s.btn(false, true), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      {'\u2197'} View Source
                    </a>
                  )}
                  <button style={{ ...s.btn(false, true), color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => deleteMatch(selectedMatch.id)}>
                    Delete
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <div style={{ ...s.label, marginBottom: '8px' }}>Notes</div>
                  <textarea
                    style={{ ...s.input, minHeight: '80px', resize: 'vertical' }}
                    placeholder="Add notes about this match..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                  />
                  <button style={s.btn(true, true)} onClick={() => saveNote(selectedMatch.id)}>Save Note</button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Config Detail + Matches Grid ── */
            <div>
              {/* Config Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9' }}>
                    {CAT_ICONS[activeConfig.category] || '\u{1F50D}'} {activeConfig.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    <span style={{ color: '#818CF8', fontWeight: 600 }}>{CAT_LABELS[activeConfig.category] || activeConfig.category}</span>
                    {activeConfig.description && ` \u00B7 ${activeConfig.description}`}
                    {activeConfig.location && ` \u00B7 ${activeConfig.location}`}
                    {(activeConfig.budget_min || activeConfig.budget_max) && ` \u00B7 $${activeConfig.budget_min?.toLocaleString() || '0'} - $${activeConfig.budget_max?.toLocaleString() || '\u221E'}`}
                  </div>
                  {/* Show keywords if stored */}
                  {activeConfig.requirements?.some((r: any) => r.key === '_keywords') && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {activeConfig.requirements.find((r: any) => r.key === '_keywords')?.value.split(',').map((kw: string, i: number) => (
                        <span key={i} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 600 }}>
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {activeConfig.requirements?.filter((r: any) => r.key !== '_keywords').length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {activeConfig.requirements.filter((r: any) => r.key !== '_keywords').map((r: any, i: number) => (
                        <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>
                          {r.key}: {r.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button style={s.btn(false, true)} onClick={() => openEdit(activeConfig)}>Edit</button>
                  <button style={{ ...s.btn(false, true), color: activeConfig.is_active ? '#10B981' : '#64748B' }}
                    onClick={() => handleToggle(activeConfig.id, !activeConfig.is_active)}>
                    {activeConfig.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button style={{ ...s.btn(true), display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleRunSearch} disabled={running}>
                    {running ? (
                      <>
                        <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Searching...
                      </>
                    ) : (
                      <>{'\u25B6'} Run Search Now</>
                    )}
                  </button>
                </div>
              </div>

              {runError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#EF4444' }}>
                  {runError}
                </div>
              )}

              {/* Search History */}
              {activeConfig.search_history && activeConfig.search_history.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>Search History</div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {activeConfig.search_history.slice(0, 8).map((h, i) => (
                      <div key={i} style={{ padding: '6px 12px', background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                        {ago(h.ran_at)} \u00B7 {h.results} results
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters & Sort */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['all', 'new', 'interested', 'saved', 'rejected'].map(f => (
                    <button key={f} onClick={() => setMatchFilter(f)}
                      style={{
                        padding: '5px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer',
                        background: matchFilter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: matchFilter === f ? '#818CF8' : '#64748B',
                        border: `1px solid ${matchFilter === f ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#475569' }}>Sort:</span>
                  {(['score', 'price', 'date'] as const).map(so => (
                    <button key={so} onClick={() => setMatchSort(so)}
                      style={{
                        padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer',
                        background: matchSort === so ? 'rgba(99,102,241,0.12)' : 'transparent',
                        color: matchSort === so ? '#818CF8' : '#64748B',
                        border: 'none',
                      }}>
                      {so.charAt(0).toUpperCase() + so.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Matches Grid */}
              {filteredMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>{'\u{1F4E5}'}</div>
                  <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '8px' }}>
                    {matches.length === 0 ? 'No matches yet' : 'No matches for this filter'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginBottom: '16px' }}>
                    Click "Run Search Now" to have AI find matching results
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                  {filteredMatches.map(m => (
                    <div key={m.id} style={s.matchCard(selectedMatch?.id === m.id)}
                      onClick={() => { setSelectedMatch(m); setNoteText(m.notes || '') }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.title}
                          </div>
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: scoreColor(m.match_score), lineHeight: 1 }}>
                          {m.match_score}
                        </div>
                      </div>

                      {/* Description */}
                      {m.description && (
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.description}
                        </div>
                      )}

                      {/* Price & Location */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {m.price && <span style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9' }}>${m.price.toLocaleString()}</span>}
                        {m.location && <span style={{ fontSize: '12px', color: '#64748B' }}>{m.location}</span>}
                        {m.source && <span style={{ fontSize: '11px', color: '#475569' }}>{m.source}</span>}
                      </div>

                      {/* Match Reasons */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {(m.match_reasons || []).slice(0, 3).map((r, i) => (
                          <span key={i} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#818CF8' }}>
                            {r}
                          </span>
                        ))}
                        {(m.match_reasons || []).length > 3 && (
                          <span style={{ fontSize: '10px', color: '#475569' }}>+{m.match_reasons.length - 3}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                        <button onClick={e => { e.stopPropagation(); updateMatchStatus(m.id, 'interested') }}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, border: 'none', background: m.status === 'interested' ? '#10B98122' : 'rgba(255,255,255,0.04)', color: m.status === 'interested' ? '#10B981' : '#64748B' }}>
                          {'\u2714'} Interested
                        </button>
                        <button onClick={e => { e.stopPropagation(); updateMatchStatus(m.id, 'rejected') }}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, border: 'none', background: m.status === 'rejected' ? '#EF444422' : 'rgba(255,255,255,0.04)', color: m.status === 'rejected' ? '#EF4444' : '#64748B' }}>
                          {'\u2716'} Not Interested
                        </button>
                        <button onClick={e => { e.stopPropagation(); updateMatchStatus(m.id, 'saved') }}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, border: 'none', background: m.status === 'saved' ? '#3B82F622' : 'rgba(255,255,255,0.04)', color: m.status === 'saved' ? '#3B82F6' : '#64748B' }}>
                          {'\u2606'} Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Delete config button */}
              <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <button style={{ fontSize: '12px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => { if (confirm('Delete this search and all its matches?')) handleDelete(activeConfig.id) }}>
                  Delete this search
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE / EDIT FORM MODAL ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>
              {editId ? 'Edit Search' : 'New Buyer Search'}
            </div>

            {/* Name */}
            <label style={s.label}>What are you looking for?</label>
            <input style={s.input} placeholder="e.g. Heavy Equipment, Commercial Property, IT Services"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

            {/* Category */}
            <label style={s.label}>Category</label>
            <select style={s.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c] || c}</option>)}
            </select>

            {/* Keywords */}
            <label style={s.label}>Search Keywords (comma-separated)</label>
            <input style={s.input} placeholder="e.g. Toyota Tacoma, 4x4, low mileage, crew cab"
              value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '-8px', marginBottom: '12px' }}>
              These keywords help the AI agent find better matches
            </div>

            {/* Description */}
            <label style={s.label}>Detailed Search Criteria</label>
            <textarea style={{ ...s.input, minHeight: '70px', resize: 'vertical' }}
              placeholder="Describe exactly what you're looking for, including specific features, conditions, brands, etc."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            {/* Budget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={s.label}>Budget Min ($)</label>
                <input style={s.input} type="number" placeholder="0" value={form.budget_min} onChange={e => setForm(f => ({ ...f, budget_min: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Budget Max ($)</label>
                <input style={s.input} type="number" placeholder="500000" value={form.budget_max} onChange={e => setForm(f => ({ ...f, budget_max: e.target.value }))} />
              </div>
            </div>

            {/* Location */}
            <label style={s.label}>Location / Region</label>
            <input style={s.input} placeholder="e.g. Northwest Arkansas, Dallas-Fort Worth"
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />

            {/* Requirements */}
            <label style={s.label}>Key Requirements</label>
            {form.requirements.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px', marginBottom: '6px' }}>
                <input style={{ ...s.input, marginBottom: 0 }} placeholder="Spec (e.g. brand, year, size)"
                  value={r.key} onChange={e => setForm(f => ({ ...f, requirements: f.requirements.map((x, j) => j === i ? { ...x, key: e.target.value } : x) }))} />
                <input style={{ ...s.input, marginBottom: 0 }} placeholder="Value (e.g. Caterpillar, 2020+)"
                  value={r.value} onChange={e => setForm(f => ({ ...f, requirements: f.requirements.map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))} />
                <button onClick={() => setForm(f => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>{'\u00D7'}</button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, requirements: [...f.requirements, { key: '', value: '' }] }))}
              style={{ fontSize: '12px', color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px' }}>+ Add Requirement</button>

            {/* Search Sources */}
            <label style={s.label}>Search Sources</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {SOURCES.map(src => (
                <label key={src} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94A3B8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.search_sources.includes(src)}
                    onChange={e => setForm(f => ({
                      ...f, search_sources: e.target.checked
                        ? [...f.search_sources, src]
                        : f.search_sources.filter(s => s !== src)
                    }))} />
                  {src.charAt(0).toUpperCase() + src.slice(1)}
                </label>
              ))}
            </div>

            {/* Schedule */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={s.label}>Schedule</label>
                <select style={s.select} value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
                  {SCHEDULES.map(sc => <option key={sc} value={sc}>{sc.charAt(0).toUpperCase() + sc.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Alert Frequency</label>
                <select style={s.select} value={form.alert_frequency} onChange={e => setForm(f => ({ ...f, alert_frequency: e.target.value }))}>
                  {ALERT_FREQ.map(af => <option key={af} value={af}>{af.charAt(0).toUpperCase() + af.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Alert Email */}
            <label style={s.label}>Alert Email (optional)</label>
            <input style={s.input} type="email" placeholder="email@company.com"
              value={form.alert_email} onChange={e => setForm(f => ({ ...f, alert_email: e.target.value }))} />

            {/* Auto follow-up */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <input type="checkbox" id="auto_fu" checked={form.auto_follow_up}
                onChange={e => setForm(f => ({ ...f, auto_follow_up: e.target.checked }))} />
              <label htmlFor="auto_fu" style={{ fontSize: '13px', color: '#94A3B8', cursor: 'pointer' }}>Auto-follow-up on matches</label>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button style={s.btn(false)} onClick={() => { setShowForm(false); setEditId(null) }}>Cancel</button>
              <button style={s.btn()} onClick={handleSave} disabled={saving || !form.name}>
                {saving ? 'Saving...' : editId ? 'Update Search' : 'Create Search'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
