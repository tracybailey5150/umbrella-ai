'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', name: '', orgName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    })
    if (signupError) { setError(signupError.message); setLoading(false); return }

    // Create org and link profile
    if (data.user) {
      const slug = form.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { data: org } = await supabase.from('organizations').insert({ name: form.orgName, slug }).select().single()
      if (org) {
        await supabase.from('profiles').update({
          org_id: org.id,
          display_name: form.name,
          role: 'owner',
        }).eq('id', data.user.id)

        // Seed default modules
        await supabase.from('org_modules').insert([
          { org_id: org.id, module: 'quote_agent', enabled: true },
          { org_id: org.id, module: 'market_watch', enabled: true },
        ])
      }
    }

    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Umbrella AI</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F1F5F9' }}>Create your account</div>
        </div>

        <form onSubmit={handleSignup} style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#FCA5A5', marginBottom: '20px' }}>
              {error}
            </div>
          )}
          {[
            { label: 'Your Name', key: 'name', type: 'text', placeholder: 'Jane Smith' },
            { label: 'Company / Organization', key: 'orgName', type: 'text', placeholder: 'Acme HVAC' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'you@company.com' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{f.label}</label>
              <input
                type={f.type} required placeholder={f.placeholder}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' as const }}
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, marginTop: '8px' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#475569' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#6366F1', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
