'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Lead = {
  id: string; name: string | null; email: string | null; phone: string | null; company: string | null
  status: string; priority: string; score: number; source: string; raw_intake: string | null
  scope_summary: string | null; qualification: any; estimated_value: number | null
  next_follow_up_at: string | null; created_at: string
  intake_agents: { name: string } | null
}
type Activity = { id: string; type: string; content: string | null; meta: any; created_at: string; profiles: { display_name: string | null; first_name: string | null } | null }

const STATUS_COLOR: Record<string, string> = { new: '#6366F1', contacted: '#F59E0B', qualified: '#3B82F6', quoted: '#8B5CF6', won: '#10B981', lost: '#64748B', unresponsive: '#EF4444' }
const STATUSES = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost', 'unresponsive']

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpType, setFollowUpType] = useState('call')

  useEffect(() => { load() }, [id])

  async function load() {
    const supabase = createClient()
    const [{ data: l }, { data: acts }] = await Promise.all([
      supabase.from('leads').select('*,intake_agents:agent_id(name)').eq('id', id).single(),
      supabase.from('lead_activities').select('*,profiles:user_id(display_name,first_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    ])
    setLead(l as unknown as Lead)
    setActivities((acts as unknown as Activity[]) ?? [])
    setLoading(false)
  }

  async function updateStatus(status: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('lead_activities').insert({ lead_id: id, user_id: user?.id, type: 'status_change', content: `Status changed to ${status}`, org_id: lead?.id })
    setLead(l => l ? { ...l, status } : l)
  }

  async function addNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    const { data } = await supabase.from('lead_activities').insert({
      lead_id: id, user_id: user?.id, org_id: profile?.org_id, type: 'note', content: noteText,
    }).select('*,profiles:user_id(display_name,first_name)').single()
    if (data) setActivities(prev => [data as unknown as Activity, ...prev])
    setNoteText('')
    setSavingNote(false)
  }

  async function scoreWithAI() {
    if (!lead?.raw_intake) return
    setScoring(true)
    try {
      const res = await fetch('/api/score-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id, intake: lead.raw_intake }),
      })
      const data = await res.json()
      if (data.score) {
        setLead(l => l ? { ...l, score: data.score, scope_summary: data.summary ?? l.scope_summary } : l)
      }
    } catch {}
    setScoring(false)
  }

  async function scheduleFollowUp() {
    if (!followUpDate) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    await supabase.from('follow_ups').insert({
      lead_id: id, org_id: profile?.org_id, assigned_to: user?.id,
      type: followUpType, due_at: new Date(followUpDate).toISOString(),
    })
    await supabase.from('leads').update({ next_follow_up_at: new Date(followUpDate).toISOString() }).eq('id', id)
    setLead(l => l ? { ...l, next_follow_up_at: new Date(followUpDate).toISOString() } : l)
    setFollowUpDate('')
  }

  const s = {
    page: { padding: '32px', maxWidth: '960px', margin: '0 auto' } as React.CSSProperties,
    back: { fontSize: '12px', color: '#475569', marginBottom: '20px', display: 'block' } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' } as React.CSSProperties,
    title: { fontSize: '20px', fontWeight: 800, color: '#F1F5F9', marginBottom: '6px' } as React.CSSProperties,
    meta: { fontSize: '13px', color: '#475569' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' } as React.CSSProperties,
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '16px' } as React.CSSProperties,
    sectionTitle: { fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '14px' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' } as React.CSSProperties,
    rowLabel: { color: '#64748B' } as React.CSSProperties,
    rowVal: { color: '#CBD5E1', fontWeight: 500 } as React.CSSProperties,
    badge: (c: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: c + '22', color: c }),
    score: (n: number): React.CSSProperties => ({ fontSize: '28px', fontWeight: 900, color: n >= 70 ? '#10B981' : n >= 40 ? '#F59E0B' : '#64748B' }),
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnSm: { background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' } as React.CSSProperties,
    input: { width: '100%', padding: '9px 12px', fontSize: '13px', marginBottom: '10px', boxSizing: 'border-box' as const },
    statusBtns: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '4px' },
    actItem: { padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' } as React.CSSProperties,
    actType: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#475569', marginBottom: '4px' } as React.CSSProperties,
    actContent: { color: '#94A3B8', lineHeight: 1.5 } as React.CSSProperties,
    actMeta: { fontSize: '11px', color: '#334155', marginTop: '4px' } as React.CSSProperties,
  }

  if (loading) return <div style={{ padding: '40px', color: '#475569' }}>Loading...</div>
  if (!lead) return <div style={{ padding: '40px', color: '#475569' }}>Lead not found.</div>

  return (
    <div style={s.page}>
      <Link href="/leads" style={s.back}>← Back to Leads</Link>

      <div style={s.header}>
        <div>
          <div style={s.title}>{lead.name || lead.email || 'Unknown Lead'}</div>
          <div style={s.meta}>
            {lead.email && <span style={{ marginRight: '16px' }}>{lead.email}</span>}
            {lead.phone && <span style={{ marginRight: '16px' }}>{lead.phone}</span>}
            {lead.company && <span>{lead.company}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={s.badge(STATUS_COLOR[lead.status] ?? '#475569')}>{lead.status}</span>
          {lead.raw_intake && !scoring && (
            <button style={s.btn} onClick={scoreWithAI}>AI Score</button>
          )}
          {scoring && <span style={{ fontSize: '12px', color: '#6366F1' }}>Scoring...</span>}
        </div>
      </div>

      <div style={s.grid}>
        <div>
          {/* Scope Summary */}
          {lead.scope_summary && (
            <div style={s.card}>
              <div style={s.sectionTitle}>AI Scope Summary</div>
              <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.7 }}>{lead.scope_summary}</div>
            </div>
          )}

          {/* Raw Intake */}
          {lead.raw_intake && (
            <div style={s.card}>
              <div style={s.sectionTitle}>Intake Notes</div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{lead.raw_intake}</div>
            </div>
          )}

          {/* Activity + Note */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Activity</div>
            <textarea
              style={{ ...s.input, height: '70px', resize: 'vertical' }}
              placeholder="Add a note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <button style={{ ...s.btn, marginBottom: '20px' }} onClick={addNote} disabled={savingNote}>
              {savingNote ? 'Saving...' : 'Add Note'}
            </button>
            {activities.length === 0 && <div style={{ color: '#334155', fontSize: '13px' }}>No activity yet.</div>}
            {activities.map(a => (
              <div key={a.id} style={s.actItem}>
                <div style={s.actType}>{a.type.replace('_', ' ')}</div>
                {a.content && <div style={s.actContent}>{a.content}</div>}
                <div style={s.actMeta}>
                  {a.profiles?.display_name ?? a.profiles?.first_name ?? 'System'} · {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Score Card */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Qualification Score</div>
            <div style={s.score(lead.score)}>{lead.score > 0 ? lead.score : '—'}<span style={{ fontSize: '14px', color: '#475569', fontWeight: 400 }}>{lead.score > 0 ? '/100' : ''}</span></div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', marginBottom: '16px' }}>
              {lead.score >= 70 ? 'Hot lead — prioritize' : lead.score >= 40 ? 'Warm — follow up' : lead.score > 0 ? 'Cold — needs nurturing' : 'Not yet scored'}
            </div>
          </div>

          {/* Lead Details */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Details</div>
            {[
              { label: 'Source', val: lead.intake_agents?.name ?? lead.source },
              { label: 'Priority', val: lead.priority },
              { label: 'Est. Value', val: lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '—' },
              { label: 'Next Follow-Up', val: lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : '—' },
              { label: 'Received', val: new Date(lead.created_at).toLocaleDateString() },
            ].map(r => (
              <div key={r.label} style={s.row}>
                <span style={s.rowLabel}>{r.label}</span>
                <span style={s.rowVal}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Update Status */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Update Status</div>
            <div style={s.statusBtns}>
              {STATUSES.map(st => (
                <button
                  key={st}
                  style={{ ...s.btnSm, ...(lead.status === st ? { background: STATUS_COLOR[st] + '22', color: STATUS_COLOR[st], borderColor: STATUS_COLOR[st] + '44' } : {}) }}
                  onClick={() => updateStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Follow-Up */}
          <div style={s.card}>
            <div style={s.sectionTitle}>Schedule Follow-Up</div>
            <select style={s.input} value={followUpType} onChange={e => setFollowUpType(e.target.value)}>
              {['call', 'email', 'text', 'meeting', 'task'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input style={s.input} type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
            <button style={s.btn} onClick={scheduleFollowUp} disabled={!followUpDate}>Schedule</button>
          </div>
        </div>
      </div>
    </div>
  )
}
