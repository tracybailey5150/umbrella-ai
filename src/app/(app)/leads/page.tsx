'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Lead = { id: string; name: string | null; email: string | null; phone: string | null; status: string; priority: string; score: number; source: string; created_at: string; intake_agents: { name: string } | null }

const STATUSES = ['all', 'new', 'contacted', 'qualified', 'quoted', 'won', 'lost']
const STATUS_COLOR: Record<string, string> = { new: '#6366F1', contacted: '#F59E0B', qualified: '#3B82F6', quoted: '#8B5CF6', won: '#10B981', lost: '#64748B', unresponsive: '#EF4444' }
const PRIORITY_COLOR: Record<string, string> = { low: '#475569', normal: '#64748B', high: '#F59E0B', urgent: '#EF4444' }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', priority: 'normal', notes: '' })
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])

  useEffect(() => { load() }, [statusFilter])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    let q = supabase.from('leads').select('id,name,email,phone,status,priority,score,source,created_at,intake_agents:agent_id(name)').order('created_at', { ascending: false }).limit(100)
    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    const [{ data }, { data: ags }] = await Promise.all([
      q,
      supabase.from('intake_agents').select('id,name').eq('is_active', true),
    ])
    setLeads((data as unknown as Lead[]) ?? [])
    setAgents(ags ?? [])
    setLoading(false)
  }

  async function createLead() {
    if (!form.name && !form.email) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    const { data, error } = await supabase.from('leads').insert({
      name: form.name || null, email: form.email || null, phone: form.phone || null,
      company: form.company || null, priority: form.priority,
      raw_intake: form.notes || null, source: 'manual', status: 'new',
      org_id: profile?.org_id,
    }).select('id,name,email,phone,status,priority,score,source,created_at,intake_agents:agent_id(name)').single()
    if (!error && data) {
      setLeads(prev => [data as unknown as Lead, ...prev])
      setShowCreate(false)
      setForm({ name: '', email: '', phone: '', company: '', priority: 'normal', notes: '' })
    }
    setSaving(false)
  }

  const s = {
    page: { padding: '32px', maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } as React.CSSProperties,
    title: { fontSize: '20px', fontWeight: 800, color: '#F1F5F9' } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    tabs: { display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' as const } as React.CSSProperties,
    tab: (active: boolean): React.CSSProperties => ({ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? 'rgba(99,102,241,0.15)' : 'transparent', color: active ? '#818CF8' : '#64748B' }),
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', color: '#CBD5E1' },
    badge: (c: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: c + '22', color: c }),
    empty: { padding: '60px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' },
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalCard: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' },
    modalTitle: { fontSize: '16px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' } as React.CSSProperties,
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' as const },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' } as React.CSSProperties,
    actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' } as React.CSSProperties,
    cancel: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>Leads</div>
        <button style={s.btn} onClick={() => setShowCreate(true)}>+ Add Lead</button>
      </div>

      <div style={s.tabs}>
        {STATUSES.map(st => (
          <button key={st} style={s.tab(statusFilter === st)} onClick={() => setStatusFilter(st)}>
            {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.empty}>Loading...</div>
        ) : leads.length === 0 ? (
          <div style={s.empty}>No leads{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''} yet.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name / Email</th>
                <th style={s.th}>Source</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Score</th>
                <th style={s.th}>Priority</th>
                <th style={s.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id}>
                  <td style={s.td}>
                    <Link href={`/leads/${l.id}`} style={{ color: '#6366F1', fontWeight: 600 }}>{l.name || l.email || 'Unknown'}</Link>
                    {l.name && l.email && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{l.email}</div>}
                  </td>
                  <td style={s.td}>{l.intake_agents?.name ?? l.source ?? '—'}</td>
                  <td style={s.td}><span style={s.badge(STATUS_COLOR[l.status] ?? '#475569')}>{l.status}</span></td>
                  <td style={s.td}>
                    {l.score > 0
                      ? <span style={{ color: l.score >= 70 ? '#10B981' : l.score >= 40 ? '#F59E0B' : '#64748B', fontWeight: 700 }}>{l.score}</span>
                      : <span style={{ color: '#334155' }}>—</span>}
                  </td>
                  <td style={s.td}><span style={{ color: PRIORITY_COLOR[l.priority] ?? '#475569', fontSize: '12px', fontWeight: 600 }}>{l.priority}</span></td>
                  <td style={s.td}>{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={s.modalCard}>
            <div style={s.modalTitle}>Add Lead Manually</div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Name</label>
                <input style={s.input} placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Priority</label>
                <select style={s.input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {['low','normal','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={s.grid2}>
              <div>
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Phone</label>
                <input style={s.input} placeholder="555-000-1234" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <label style={s.label}>Company</label>
            <input style={s.input} placeholder="Company name" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            <label style={s.label}>Notes / Intake Summary</label>
            <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} placeholder="What do they need?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div style={s.actions}>
              <button style={s.cancel} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={s.btn} onClick={createLead} disabled={saving}>{saving ? 'Saving...' : 'Add Lead'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
