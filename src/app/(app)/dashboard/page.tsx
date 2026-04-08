'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type KPIs = { newLeads: number; openFollowUps: number; hotLeads: number; trendSignals: number }

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs>({ newLeads: 0, openFollowUps: 0, hotLeads: 0, trendSignals: 0 })
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, organizations(name)')
        .eq('id', user.id).single()

      if (profile?.organizations) setOrgName((profile.organizations as any).name ?? '')

      const today = new Date(); today.setHours(0,0,0,0)

      const [
        { count: newLeads },
        { count: openFollowUps },
        { count: hotLeads },
        { count: trendSignals },
        { data: leads },
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('follow_ups').select('id', { count: 'exact', head: true }).is('completed_at', null).lte('due_at', new Date().toISOString()),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('score', 70).not('status', 'in', '(won,lost)'),
        supabase.from('trend_topics').select('id', { count: 'exact', head: true }).in('relevance', ['high', 'urgent']),
        supabase.from('leads').select('id,name,email,status,score,priority,created_at,intake_agents(name)').order('created_at', { ascending: false }).limit(6),
      ])

      setKpis({ newLeads: newLeads ?? 0, openFollowUps: openFollowUps ?? 0, hotLeads: hotLeads ?? 0, trendSignals: trendSignals ?? 0 })
      setRecentLeads((leads as any[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const STATUS_COLOR: Record<string, string> = { new: '#6366F1', contacted: '#F59E0B', qualified: '#3B82F6', quoted: '#8B5CF6', won: '#10B981', lost: '#64748B', unresponsive: '#EF4444' }
  const PRIORITY_COLOR: Record<string, string> = { low: '#475569', normal: '#64748B', high: '#F59E0B', urgent: '#EF4444' }

  const kpiCards = [
    { label: 'New Leads',      value: kpis.newLeads,      sub: 'awaiting contact',   color: '#6366F1', href: '/leads?status=new' },
    { label: 'Due Follow-Ups', value: kpis.openFollowUps, sub: 'overdue or today',    color: '#F59E0B', href: '/follow-ups' },
    { label: 'Hot Leads',      value: kpis.hotLeads,      sub: 'score ≥ 70',          color: '#10B981', href: '/leads?priority=high' },
    { label: 'Trend Signals',  value: kpis.trendSignals,  sub: 'high relevance',      color: '#EF4444', href: '/market-watch' },
  ]

  const s = {
    page: { padding: '32px', maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
    heading: { fontSize: '22px', fontWeight: 800, color: '#F1F5F9', marginBottom: '4px' } as React.CSSProperties,
    sub: { fontSize: '13px', color: '#475569', marginBottom: '32px' } as React.CSSProperties,
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '16px', marginBottom: '40px' } as React.CSSProperties,
    kpiCard: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', textDecoration: 'none', display: 'block' } as React.CSSProperties,
    kpiVal: (c: string): React.CSSProperties => ({ fontSize: '32px', fontWeight: 800, color: c, marginBottom: '4px' }),
    kpiLabel: { fontSize: '12px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' } as React.CSSProperties,
    kpiSub: { fontSize: '11px', color: '#475569', marginTop: '2px' } as React.CSSProperties,
    sectionTitle: { fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '16px' } as React.CSSProperties,
    card: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' } as React.CSSProperties,
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '10px 16px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', color: '#CBD5E1' },
    badge: (c: string): React.CSSProperties => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, background: c + '22', color: c }),
    emptyRow: { padding: '40px', textAlign: 'center' as const, color: '#475569', fontSize: '13px' },
  }

  return (
    <div style={s.page}>
      <div style={s.heading}>{orgName || 'Umbrella AI'}</div>
      <div style={s.sub}>Your quote agent & intelligence dashboard.</div>

      <div style={s.kpiGrid}>
        {kpiCards.map(k => (
          <a key={k.label} href={k.href} style={s.kpiCard}>
            <div style={s.kpiVal(k.color)}>{loading ? '—' : k.value}</div>
            <div style={s.kpiLabel}>{k.label}</div>
            <div style={s.kpiSub}>{k.sub}</div>
          </a>
        ))}
      </div>

      <div style={s.sectionTitle}>Recent Leads</div>
      <div style={s.card}>
        {recentLeads.length === 0 && !loading ? (
          <div style={s.emptyRow}>No leads yet — <Link href="/intake" style={{ color: '#6366F1' }}>set up your intake agent</Link> to start capturing.</div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Source</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Score</th>
                <th style={s.th}>Priority</th>
                <th style={s.th}>Received</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map(l => (
                <tr key={l.id}>
                  <td style={s.td}><Link href={`/leads/${l.id}`} style={{ color: '#6366F1' }}>{l.name || l.email || 'Unknown'}</Link></td>
                  <td style={s.td}>{(l.intake_agents as any)?.name ?? l.source ?? '—'}</td>
                  <td style={s.td}><span style={s.badge(STATUS_COLOR[l.status] ?? '#475569')}>{l.status}</span></td>
                  <td style={s.td}>{l.score > 0 ? <span style={{ color: l.score >= 70 ? '#10B981' : l.score >= 40 ? '#F59E0B' : '#64748B', fontWeight: 700 }}>{l.score}</span> : '—'}</td>
                  <td style={s.td}><span style={{ color: PRIORITY_COLOR[l.priority] ?? '#475569', fontSize: '12px', fontWeight: 600 }}>{l.priority}</span></td>
                  <td style={s.td}>{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
