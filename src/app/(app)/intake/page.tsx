'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Agent = { id: string; name: string; vertical: string; is_active: boolean; embed_key: string; greeting: string; created_at: string }

const VERTICALS = ['general', 'hvac', 'av', 'contractor', 'real_estate', 'field_service', 'other']

export default function IntakePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', vertical: 'general', greeting: 'Hi! How can we help you today?', ai_instructions: '' })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('intake_agents').select('*').order('created_at', { ascending: false })
    setAgents((data as Agent[]) ?? [])
    setLoading(false)
  }

  async function createAgent() {
    if (!form.name) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
    const { data, error } = await supabase.from('intake_agents').insert({
      name: form.name, vertical: form.vertical, greeting: form.greeting,
      ai_instructions: form.ai_instructions || null,
      org_id: profile?.org_id, is_active: true,
    }).select().single()
    if (!error && data) {
      setAgents(prev => [data as Agent, ...prev])
      setShowCreate(false)
      setForm({ name: '', vertical: 'general', greeting: 'Hi! How can we help you today?', ai_instructions: '' })
    }
    setSaving(false)
  }

  async function toggleAgent(agent: Agent) {
    const supabase = createClient()
    await supabase.from('intake_agents').update({ is_active: !agent.is_active }).eq('id', agent.id)
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, is_active: !a.is_active } : a))
  }

  function copyLink(key: string) {
    const url = `${window.location.origin}/intake/${key}`
    navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const s = {
    page: { padding: '32px', maxWidth: '900px', margin: '0 auto' } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' } as React.CSSProperties,
    title: { fontSize: '20px', fontWeight: 800, color: '#F1F5F9' } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' } as React.CSSProperties,
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' } as React.CSSProperties,
    cardTitle: { fontSize: '15px', fontWeight: 700, color: '#F1F5F9', marginBottom: '6px' } as React.CSSProperties,
    vertical: { fontSize: '11px', fontWeight: 600, color: '#6366F1', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '12px' } as React.CSSProperties,
    greeting: { fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: '16px', fontStyle: 'italic' } as React.CSSProperties,
    actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' as const } as React.CSSProperties,
    btnSm: (active: boolean): React.CSSProperties => ({ background: active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', color: active ? '#10B981' : '#64748B', border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }),
    copyBtn: (copied: boolean): React.CSSProperties => ({ background: copied ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', color: copied ? '#818CF8' : '#64748B', border: `1px solid ${copied ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }),
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalCard: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' as const },
    empty: { padding: '60px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' },
    cancel: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
    formActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Intake Agents</div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Each agent gets a shareable intake URL for your business.</div>
        </div>
        <button style={s.btn} onClick={() => setShowCreate(true)}>+ New Agent</button>
      </div>

      {loading ? (
        <div style={s.empty}>Loading...</div>
      ) : agents.length === 0 ? (
        <div style={s.empty}>No intake agents yet. Create one to start capturing leads.</div>
      ) : (
        <div style={s.grid}>
          {agents.map(agent => (
            <div key={agent.id} style={{ ...s.card, opacity: agent.is_active ? 1 : 0.5 }}>
              <div style={s.cardTitle}>{agent.name}</div>
              <div style={s.vertical}>{agent.vertical}</div>
              <div style={s.greeting}>"{agent.greeting}"</div>
              <div style={s.actions}>
                <button style={s.btnSm(agent.is_active)} onClick={() => toggleAgent(agent)}>
                  {agent.is_active ? '● Active' : '○ Inactive'}
                </button>
                <button style={s.copyBtn(copied === agent.embed_key)} onClick={() => copyLink(agent.embed_key)}>
                  {copied === agent.embed_key ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
                <a href={`/intake/${agent.embed_key}`} target="_blank" rel="noreferrer"
                  style={{ ...s.copyBtn(false), textDecoration: 'none', display: 'inline-block' }}>
                  Preview ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={s.modalCard}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px' }}>New Intake Agent</div>
            <label style={s.label}>Agent Name *</label>
            <input style={s.input} placeholder="e.g. HVAC Quote Agent" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <label style={s.label}>Vertical</label>
            <select style={s.input} value={form.vertical} onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <label style={s.label}>Greeting Message</label>
            <input style={s.input} placeholder="Hi! How can we help?" value={form.greeting} onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))} />
            <label style={s.label}>AI Instructions (optional)</label>
            <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} placeholder="e.g. Focus on HVAC replacement projects. Always ask about home age and system age..." value={form.ai_instructions} onChange={e => setForm(f => ({ ...f, ai_instructions: e.target.value }))} />
            <div style={s.formActions}>
              <button style={s.cancel} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={s.btn} onClick={createAgent} disabled={saving}>{saving ? 'Creating...' : 'Create Agent'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
