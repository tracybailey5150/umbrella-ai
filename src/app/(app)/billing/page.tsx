'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PLANS, PlanKey } from '@/lib/stripe'

const PLAN_COLORS: Record<string, string> = { free: '#64748B', pro: '#6366F1', business: '#F59E0B' }

export default function BillingPage() {
  const [orgId, setOrgId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const [sub, setSub] = useState<{ status: string; current_period_end: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) { /* show success toast */ }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserEmail(data.user.email ?? '')
      const { data: profile } = await supabase.from('profiles').select('org_id, organizations(plan)').eq('id', data.user.id).single()
      if (profile) {
        setOrgId(profile.org_id)
        setCurrentPlan((profile.organizations as any)?.plan ?? 'free')
        const { data: subData } = await supabase.from('subscriptions').select('status, current_period_end').eq('org_id', profile.org_id).single()
        setSub(subData)
      }
      setLoading(false)
    })
  }, [])

  async function handleUpgrade(plan: PlanKey) {
    if (plan === 'free') return
    setRedirecting(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, orgId, userEmail }),
    })
    const json = await res.json()
    if (json.url) window.location.href = json.url
    else setRedirecting(null)
  }

  async function handlePortal() {
    setRedirecting('portal')
    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    const json = await res.json()
    if (json.url) window.location.href = json.url
    else setRedirecting(null)
  }

  const s = {
    page: { padding: '32px 36px', maxWidth: '960px' } as React.CSSProperties,
    h1: { fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' } as React.CSSProperties,
    sub: { fontSize: '13px', color: '#64748B', marginBottom: '32px' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' } as React.CSSProperties,
    card: (active: boolean, plan: string): React.CSSProperties => ({
      background: active ? `${PLAN_COLORS[plan]}12` : '#0C1525',
      border: `2px solid ${active ? PLAN_COLORS[plan] : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '12px', padding: '24px', position: 'relative',
    }),
    badge: (plan: string): React.CSSProperties => ({
      position: 'absolute', top: '12px', right: '12px',
      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
      borderRadius: '4px', backgroundColor: `${PLAN_COLORS[plan]}20`, color: PLAN_COLORS[plan],
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }),
    planName: (plan: string): React.CSSProperties => ({ fontSize: '16px', fontWeight: 700, color: PLAN_COLORS[plan], marginBottom: '4px' }),
    price: { fontSize: '28px', fontWeight: 800, color: '#F1F5F9', lineHeight: 1 } as React.CSSProperties,
    priceSub: { fontSize: '12px', color: '#64748B', marginBottom: '16px' } as React.CSSProperties,
    feature: { fontSize: '12px', color: '#94A3B8', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
    btn: (active: boolean, plan: string): React.CSSProperties => ({
      marginTop: '20px', width: '100%', padding: '10px',
      background: active ? `${PLAN_COLORS[plan]}20` : PLAN_COLORS[plan],
      color: active ? PLAN_COLORS[plan] : '#fff',
      border: `1px solid ${PLAN_COLORS[plan]}`,
      borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: active ? 'default' : 'pointer',
    }),
    currentBox: { background: '#0C1525', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '20px' } as React.CSSProperties,
  }

  if (loading) return <div style={{ padding: '40px', color: '#64748B' }}>Loading billing info...</div>

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Billing & Plans</h1>
      <p style={s.sub}>Manage your subscription and usage limits</p>

      <div style={s.grid}>
        {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan]) => {
          const active = currentPlan === key
          return (
            <div key={key} style={s.card(active, key)}>
              {active && <span style={s.badge(key)}>Current</span>}
              <div style={s.planName(key)}>{plan.name}</div>
              <div style={s.price}>${plan.price}</div>
              <div style={s.priceSub}>{plan.price === 0 ? 'Free forever' : '/month'}</div>
              {plan.features.map(f => (
                <div key={f} style={s.feature}><span style={{ color: PLAN_COLORS[key] }}>✓</span>{f}</div>
              ))}
              {key === 'free' ? (
                <button style={s.btn(true, key)} disabled>Free Plan</button>
              ) : active ? (
                <button style={s.btn(true, key)} onClick={handlePortal} disabled={redirecting === 'portal'}>
                  {redirecting === 'portal' ? 'Opening...' : 'Manage Subscription'}
                </button>
              ) : (
                <button style={s.btn(false, key)} onClick={() => handleUpgrade(key)} disabled={!!redirecting}>
                  {redirecting === key ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={s.currentBox}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Current Subscription</div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>Plan</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: PLAN_COLORS[currentPlan] ?? '#64748B', textTransform: 'capitalize' }}>{currentPlan}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>Status</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: sub?.status === 'active' ? '#10B981' : '#F59E0B' }}>{sub?.status ?? 'Free'}</div>
          </div>
          {sub?.current_period_end && (
            <div>
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '2px' }}>Renews</div>
              <div style={{ fontSize: '14px', color: '#94A3B8' }}>{new Date(sub.current_period_end).toLocaleDateString()}</div>
            </div>
          )}
        </div>
        {currentPlan !== 'free' && (
          <button onClick={handlePortal} style={{ marginTop: '16px', padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
            {redirecting === 'portal' ? 'Opening portal...' : 'Manage billing / cancel →'}
          </button>
        )}
      </div>
    </div>
  )
}
