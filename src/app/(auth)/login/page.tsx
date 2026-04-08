'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Umbrella AI</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F1F5F9' }}>Sign in to your account</div>
        </div>

        <form onSubmit={handleLogin} style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#FCA5A5', marginBottom: '20px' }}>
              {error}
            </div>
          )}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Email</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{ width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }}
          />
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Password</label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box' }}
          />
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#475569' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#6366F1', fontWeight: 600 }}>Create one</Link>
        </div>
      </div>
    </div>
  )
}
