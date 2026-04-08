'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Item = { id: string; name: string; category: string; unit: string | null; current_price: number | null; previous_price: number | null; price_change_pct: number | null; source: string | null; alert_threshold_pct: number; is_active: boolean; last_checked_at: string | null; notes: string | null }
type Signal = { id: string; item_id: string; category: string; signal_type: string; old_price: number | null; new_price: number | null; change_pct: number | null; headline: string | null; created_at: string }

const CATEGORIES = [
  { key: 'materials',        label: 'Materials',        icon: '🏗️', desc: 'Lumber, steel, copper, concrete' },
  { key: 'labor',            label: 'Labor',            icon: '👷', desc: 'Prevailing wages, skilled trades rates' },
  { key: 'fuel_logistics',   label: 'Fuel & Logistics', icon: '⛽', desc: 'Diesel, delivery surcharges' },
  { key: 'equipment_rental', label: 'Equipment Rental', icon: '🚜', desc: 'Crane, lift, excavator rates' },
  { key: 'regulatory',       label: 'Regulatory',       icon: '📋', desc: 'Permits, inspection fees, code changes' },
]
const CAT_COLORS: Record<string, string> = { materials: '#F59E0B', labor: '#10B981', fuel_logistics: '#EF4444', equipment_rental: '#6366F1', regulatory: '#8B5CF6' }

const blankForm = { name: '', category: 'materials', unit: '', current_price: '', alert_threshold_pct: '5', source: '', notes: '' }

export default function SupplyWatchPage() {
  const [items, setItems] = useState<Item[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<string | null>(null)
  const [orgId, setOrgId] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...blankForm })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', data.user.id).single()
      if (profile?.org_id) { setOrgId(profile.org_id); load() }
    })
  }, [])

  async function load() {
    setLoading(true)
    const [itemsRes, signalsRes] = await Promise.all([
      fetch('/api/supply-watch').then(r => r.json()),
      fetch('/api/supply-watch/signals').then(r => r.json()).catch(() => ({ data: [] })),
    ])
    setItems(itemsRes.data || [])
    setSignals(signalsRes.data || [])
    setLoading(false)
  }

  async function handleScan() {
    setScanning(true); setScanMsg(null)
    const res = await fetch('/api/supply-watch/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orgId }) })
    const json = await res.json()
    setScanMsg(json.data ? `Scanned ${json.data.scanned} items · ${json.data.alerts} alerts` : 'Error')
    setScanning(false); load()
  }

  async function handleSave() {
    setSaving(true)
    const payload = { ...form, current_price: form.current_price ? Number(form.current_price) : null, alert_threshold_pct: Number(form.alert_threshold_pct) }
    await fetch('/api/supply-watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false); setShowForm(false); setForm({ ...blankForm }); load()
  }

  async function handleToggle(id: string, is_active: boolean) {
    await fetch('/api/supply-watch', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) })
    setItems(items => items.map(x => x.id === id ? { ...x, is_active } : x))
  }

  const filtered = activeTab === 'all' ? items : items.filter(i => i.category === activeTab)
  const alerts = items.filter(i => i.price_change_pct != null && Math.abs(i.price_change_pct) >= i.alert_threshold_pct)

  const s = {
    page: { padding: '32px 36px', maxWidth: '1100px' } as React.CSSProperties,
    h1: { fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' } as React.CSSProperties,
    sub: { fontSize: '13px', color: '#64748B', marginBottom: '24px' } as React.CSSProperties,
    btn: (primary = true): React.CSSProperties => ({ padding: '9px 18px', background: primary ? '#6366F1' : 'transparent', color: primary ? '#fff' : '#64748B', border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }),
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px 20px', marginBottom: '8px' } as React.CSSProperties,
    label: { fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '4px' } as React.CSSProperties,
    input: { width: '100%', background: '#060B18', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', borderRadius: '6px', padding: '9px 12px', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' as const } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={s.h1}>Supply Price Watcher</h1>
          <p style={s.sub}>Track price movements across 5 signal categories — get alerted when costs shift</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {scanMsg && <span style={{ fontSize: '12px', color: '#10B981' }}>{scanMsg}</span>}
          <button style={s.btn(false)} onClick={handleScan} disabled={scanning}>{scanning ? 'Scanning...' : '⟳ Scan Now'}</button>
          <button style={s.btn()} onClick={() => setShowForm(true)}>+ Add Item</button>
        </div>
      </div>

      {/* Category overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat.key)
          const catAlerts = catItems.filter(i => i.price_change_pct != null && Math.abs(i.price_change_pct) >= i.alert_threshold_pct)
          const avgChange = catItems.length ? catItems.reduce((a, i) => a + (i.price_change_pct ?? 0), 0) / catItems.length : 0
          return (
            <button key={cat.key} onClick={() => setActiveTab(activeTab === cat.key ? 'all' : cat.key)}
              style={{ background: activeTab === cat.key ? `${CAT_COLORS[cat.key]}15` : '#0C1525', border: `1px solid ${activeTab === cat.key ? CAT_COLORS[cat.key] : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', padding: '14px', textAlign: 'left', cursor: 'pointer' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{cat.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#F1F5F9' }}>{cat.label}</div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{catItems.length} items</div>
              {catAlerts.length > 0 && <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '4px' }}>⚠ {catAlerts.length} alert{catAlerts.length !== 1 ? 's' : ''}</div>}
              {catItems.length > 0 && Math.abs(avgChange) > 0.5 && <div style={{ fontSize: '11px', color: avgChange > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>{avgChange > 0 ? '↑' : '↓'}{Math.abs(avgChange).toFixed(1)}% avg</div>}
            </button>
          )
        })}
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div style={{ background: '#EF444415', border: '1px solid #EF444430', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FCA5A5' }}>{alerts.length} price alert{alerts.length !== 1 ? 's' : ''} triggered</div>
            <div style={{ fontSize: '12px', color: '#EF4444' }}>{alerts.map(a => `${a.name} (${(a.price_change_pct! > 0 ? '+' : '') + a.price_change_pct?.toFixed(1)}%)`).join(' · ')}</div>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? <div style={{ color: '#475569', padding: '40px 0' }}>Loading...</div> : filtered.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '8px' }}>No items being watched</div>
          <div style={{ color: '#475569', fontSize: '12px', marginBottom: '16px' }}>Add items to track across the 5 signal categories</div>
          <button style={s.btn()} onClick={() => setShowForm(true)}>+ Add First Item</button>
        </div>
      ) : (
        <div>
          {filtered.map(item => {
            const catMeta = CATEGORIES.find(c => c.key === item.category)
            const hasAlert = item.price_change_pct != null && Math.abs(item.price_change_pct) >= item.alert_threshold_pct
            const pct = item.price_change_pct
            return (
              <div key={item.id} style={{ ...s.card, borderColor: hasAlert ? '#EF444430' : 'rgba(255,255,255,0.06)', opacity: item.is_active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px' }}>{catMeta?.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: CAT_COLORS[item.category], textTransform: 'uppercase', letterSpacing: '0.05em' }}>{catMeta?.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    {item.current_price != null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#F1F5F9' }}>${item.current_price.toFixed(2)} <span style={{ fontSize: '11px', color: '#475569' }}>{item.unit}</span></div>
                        {pct != null && Math.abs(pct) > 0.1 && (
                          <div style={{ fontSize: '12px', fontWeight: 700, color: pct > 0 ? '#EF4444' : '#10B981' }}>{pct > 0 ? '↑ +' : '↓ '}{pct.toFixed(1)}%</div>
                        )}
                      </div>
                    )}
                    {item.last_checked_at && <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(item.last_checked_at).toLocaleDateString()}</div>}
                    <button onClick={() => handleToggle(item.id, !item.is_active)} style={{ fontSize: '11px', padding: '3px 8px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', borderRadius: '4px', cursor: 'pointer' }}>
                      {item.is_active ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>
                {item.notes && <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px' }}>{item.notes}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Recent signals */}
      {signals.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Recent Signals</div>
          {signals.slice(0, 15).map(sig => (
            <div key={sig.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '16px' }}>{CATEGORIES.find(c => c.key === sig.category)?.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>{sig.headline}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(sig.created_at).toLocaleString()}</div>
                </div>
              </div>
              {sig.change_pct != null && (
                <span style={{ fontSize: '13px', fontWeight: 700, color: sig.signal_type === 'alert' ? '#EF4444' : sig.change_pct > 0 ? '#F59E0B' : '#10B981' }}>
                  {sig.change_pct > 0 ? '+' : ''}{sig.change_pct.toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add item modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '28px', width: '440px' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#F1F5F9', marginBottom: '20px' }}>Add Watch Item</div>
            <div style={s.label}>Item Name</div>
            <input style={s.input} placeholder="e.g. Framing Lumber" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div style={s.label}>Category</div>
            <select style={s.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label} — {c.desc}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={s.label}>Current Price ($)</div>
                <input style={s.input} type="number" step="0.01" placeholder="0.00" value={form.current_price} onChange={e => setForm(f => ({ ...f, current_price: e.target.value }))} />
              </div>
              <div>
                <div style={s.label}>Unit</div>
                <input style={s.input} placeholder="per board ft, per hr..." value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={s.label}>Alert Threshold (%)</div>
                <input style={s.input} type="number" placeholder="5" value={form.alert_threshold_pct} onChange={e => setForm(f => ({ ...f, alert_threshold_pct: e.target.value }))} />
              </div>
              <div>
                <div style={s.label}>Source</div>
                <input style={s.input} placeholder="e.g. RS Means, local supplier" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
              </div>
            </div>
            <div style={s.label}>Notes (optional)</div>
            <input style={s.input} placeholder="Additional context..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button style={s.btn(false)} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={s.btn()} onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
