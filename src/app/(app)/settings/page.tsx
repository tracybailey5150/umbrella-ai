'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ display_name: '', first_name: '', last_name: '' })
  const [orgForm, setOrgForm] = useState({ name: '', website: '', industry: '' })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*,organizations(*)').eq('id', user.id).single()
      if (p) {
        setProfile(p)
        setForm({ display_name: p.display_name ?? '', first_name: p.first_name ?? '', last_name: p.last_name ?? '' })
        const o = (p as any).organizations
        if (o) { setOrg(o); setOrgForm({ name: o.name ?? '', website: o.website ?? '', industry: o.industry ?? '' }) }
      }
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ display_name: form.display_name, first_name: form.first_name, last_name: form.last_name }).eq('id', user!.id)
    if (org) await supabase.from('organizations').update({ name: orgForm.name, website: orgForm.website || null, industry: orgForm.industry || null }).eq('id', org.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const s = {
    page: { padding: '32px', maxWidth: '640px', margin: '0 auto' } as React.CSSProperties,
    title: { fontSize: '20px', fontWeight: 800, color: '#F1F5F9', marginBottom: '32px' } as React.CSSProperties,
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '20px' } as React.CSSProperties,
    sectionTitle: { fontSize: '13px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '6px' },
    input: { width: '100%', padding: '10px 12px', fontSize: '13px', marginBottom: '14px', boxSizing: 'border-box' as const },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' } as React.CSSProperties,
    btn: { background: saved ? '#059669' : '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={s.title}>Settings</div>

      <div style={s.card}>
        <div style={s.sectionTitle}>Your Profile</div>
        <label style={s.label}>Display Name</label>
        <input style={s.input} placeholder="Your name" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
        <div style={s.grid2}>
          <div>
            <label style={s.label}>First Name</label>
            <input style={s.input} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div>
            <label style={s.label}>Last Name</label>
            <input style={s.input} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
        </div>
      </div>

      {org && (
        <div style={s.card}>
          <div style={s.sectionTitle}>Organization</div>
          <label style={s.label}>Organization Name</label>
          <input style={s.input} value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} />
          <label style={s.label}>Website</label>
          <input style={s.input} placeholder="https://yourcompany.com" value={orgForm.website} onChange={e => setOrgForm(f => ({ ...f, website: e.target.value }))} />
          <label style={s.label}>Industry</label>
          <input style={s.input} placeholder="e.g. HVAC, AV Integration, Construction" value={orgForm.industry} onChange={e => setOrgForm(f => ({ ...f, industry: e.target.value }))} />
        </div>
      )}

      <button style={s.btn} onClick={saveProfile} disabled={saving}>
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  )
}
