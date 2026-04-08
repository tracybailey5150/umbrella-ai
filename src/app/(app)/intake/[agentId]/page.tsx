'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Agent = { id: string; name: string; vertical: string; greeting: string; ai_instructions: string | null }

export default function PublicIntakePage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [step, setStep] = useState<'intro' | 'form' | 'submitted'>('intro')
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', needs: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/intake?agentId=${agentId}`)
      .then(r => r.json())
      .then(d => { if (d.agent) setAgent(d.agent) })
      .catch(() => {})
  }, [agentId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.needs.trim()) { setError('Please describe what you need.'); return }
    setSubmitting(true); setError('')
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, ...form }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSubmitting(false); return }
    setStep('submitted')
  }

  const s = {
    wrap: { minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' } as React.CSSProperties,
    card: { width: '100%', maxWidth: '540px', background: '#0C1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px' } as React.CSSProperties,
    label: { fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: '6px' },
    input: { width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' as const },
    btn: { width: '100%', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' } as React.CSSProperties,
  }

  if (!agent) return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#475569', fontSize: '14px' }}>Loading...</div>
    </div>
  )

  if (step === 'submitted') return (
    <div style={s.wrap}>
      <div style={{ ...s.card, textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✓</div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#F1F5F9', marginBottom: '10px' }}>Got it — we'll be in touch.</div>
        <div style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6 }}>
          Thanks for reaching out. We&apos;ve received your request and will follow up shortly.
        </div>
      </div>
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
          {agent.name}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#F1F5F9', marginBottom: '8px' }}>
          {step === 'intro' ? agent.greeting : 'Tell us more'}
        </div>
        {step === 'intro' && (
          <>
            <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '32px', lineHeight: 1.6 }}>
              Fill out the form and we&apos;ll review your request and get back to you quickly.
            </div>
            <button style={s.btn} onClick={() => setStep('form')}>Get Started →</button>
          </>
        )}
        {step === 'form' && (
          <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FCA5A5', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div>
                <label style={s.label}>Your Name *</label>
                <input style={s.input} placeholder="Jane Smith" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={s.label}>Phone</label>
                <input style={s.input} placeholder="555-000-1234" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <label style={s.label}>Email *</label>
            <input style={s.input} type="email" required placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <label style={s.label}>Company (optional)</label>
            <input style={s.input} placeholder="Your company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            <label style={s.label}>What do you need? *</label>
            <textarea
              style={{ ...s.input, height: '100px', resize: 'vertical' }}
              required placeholder="Describe your project or request..."
              value={form.needs} onChange={e => setForm(f => ({ ...f, needs: e.target.value }))}
            />
            <button type="submit" style={s.btn} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
