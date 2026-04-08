'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type FollowUp = {
  id: string; type: string; notes: string | null; due_at: string; completed_at: string | null
  leads: { id: string; name: string | null; email: string | null } | null
}

const TYPE_ICON: Record<string, string> = { call: '📞', email: '✉️', text: '💬', meeting: '📅', task: '✅' }

function groupByDue(items: FollowUp[]) {
  const now = new Date(); now.setHours(0,0,0,0)
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const overdue: FollowUp[] = [], today: FollowUp[] = [], upcoming: FollowUp[] = []
  for (const item of items) {
    const due = new Date(item.due_at)
    if (due < now) overdue.push(item)
    else if (due < tomorrow) today.push(item)
    else upcoming.push(item)
  }
  return { overdue, today, upcoming }
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('follow_ups')
      .select('id,type,notes,due_at,completed_at,leads:lead_id(id,name,email)')
      .is('completed_at', null)
      .order('due_at', { ascending: true })
      .limit(100)
    setItems((data as unknown as FollowUp[]) ?? [])
    setLoading(false)
  }

  async function markDone(id: string) {
    setCompleting(id)
    const supabase = createClient()
    await supabase.from('follow_ups').update({ completed_at: new Date().toISOString() }).eq('id', id)
    setItems(prev => prev.filter(f => f.id !== id))
    setCompleting(null)
  }

  const { overdue, today, upcoming } = groupByDue(items)

  const s = {
    page: { padding: '32px', maxWidth: '800px', margin: '0 auto' } as React.CSSProperties,
    title: { fontSize: '20px', fontWeight: 800, color: '#F1F5F9', marginBottom: '8px' } as React.CSSProperties,
    sub: { fontSize: '13px', color: '#475569', marginBottom: '32px' } as React.CSSProperties,
    sectionLabel: (color: string): React.CSSProperties => ({ fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', marginTop: '28px' }),
    item: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 20px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    itemLeft: { display: 'flex', alignItems: 'center', gap: '12px' } as React.CSSProperties,
    icon: { fontSize: '18px', flexShrink: 0 } as React.CSSProperties,
    leadName: { fontSize: '14px', fontWeight: 600, color: '#F1F5F9' } as React.CSSProperties,
    due: { fontSize: '11px', color: '#475569', marginTop: '2px' } as React.CSSProperties,
    notes: { fontSize: '12px', color: '#64748B', marginTop: '4px' } as React.CSSProperties,
    doneBtn: { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
    empty: { padding: '40px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' },
  }

  const Section = ({ label, color, items }: { label: string; color: string; items: FollowUp[] }) => (
    items.length > 0 ? (
      <div>
        <div style={s.sectionLabel(color)}>{label} ({items.length})</div>
        {items.map(f => (
          <div key={f.id} style={s.item}>
            <div style={s.itemLeft}>
              <span style={s.icon}>{TYPE_ICON[f.type] ?? '🔔'}</span>
              <div>
                <div style={s.leadName}>
                  <Link href={`/leads/${f.leads?.id}`} style={{ color: '#6366F1' }}>
                    {f.leads?.name || f.leads?.email || 'Unknown Lead'}
                  </Link>
                  <span style={{ color: '#475569', fontWeight: 400, marginLeft: '8px', fontSize: '12px' }}>{f.type}</span>
                </div>
                <div style={s.due}>{new Date(f.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                {f.notes && <div style={s.notes}>{f.notes}</div>}
              </div>
            </div>
            <button style={s.doneBtn} disabled={completing === f.id} onClick={() => markDone(f.id)}>
              {completing === f.id ? '...' : '✓ Done'}
            </button>
          </div>
        ))}
      </div>
    ) : null
  )

  return (
    <div style={s.page}>
      <div style={s.title}>Follow-Ups</div>
      <div style={s.sub}>{items.length} open · {overdue.length} overdue</div>

      {loading ? (
        <div style={s.empty}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={s.empty}>All caught up — no open follow-ups.</div>
      ) : (
        <>
          <Section label="Overdue" color="#EF4444" items={overdue} />
          <Section label="Today" color="#F59E0B" items={today} />
          <Section label="Upcoming" color="#64748B" items={upcoming} />
        </>
      )}
    </div>
  )
}
