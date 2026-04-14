'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Umbrella AI</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F1F5F9' }}>Reset your password</div>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '8px' }}>Enter your email and we&apos;ll send you a reset link</div>
        </div>

        {success ? (
          <div style={{ background: '#0C1525', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📧</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', marginBottom: '8px' }}>Check your email</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
              We sent a password reset link to <strong style={{ color: '#E2E8F0' }}>{email}</strong>. Click the link in the email to set a new password.
            </div>
            <Link href="/login" style={{ display: 'inline-block', marginTop: '24px', color: '#6366F1', fontWeight: 600, fontSize: '13px' }}>
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#FCA5A5', marginBottom: '20px' }}>
                {error}
              </div>
            )}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Email Address</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box', background: '#0A1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }}
            />
            <button
              type="submit" disabled={loading}
              style={{ width: '100%', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#475569' }}>
          Remember your password?{' '}
          <Link href="/login" style={{ color: '#6366F1', fontWeight: 600 }}>Sign In</Link>
        </div>
      </div>
    </div>
  )
}
