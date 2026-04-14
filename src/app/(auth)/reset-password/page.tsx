'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Supabase injects the recovery token via the URL hash
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via the reset link — they can now set a new password
      }
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else { setSuccess(true); setLoading(false); setTimeout(() => router.push('/dashboard'), 2000) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Umbrella AI</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F1F5F9' }}>Set a new password</div>
        </div>

        {success ? (
          <div style={{ background: '#0C1525', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', marginBottom: '8px' }}>Password updated!</div>
            <div style={{ fontSize: '13px', color: '#94A3B8' }}>Redirecting to your dashboard...</div>
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ background: '#0C1525', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#FCA5A5', marginBottom: '20px' }}>
                {error}
              </div>
            )}
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>New Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', background: '#0A1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }}
            />
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Confirm Password</label>
            <input
              type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              style={{ width: '100%', padding: '11px 14px', fontSize: '14px', marginBottom: '24px', boxSizing: 'border-box', background: '#0A1020', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#E2E8F0' }}
            />
            <button
              type="submit" disabled={loading}
              style={{ width: '100%', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#475569' }}>
          <Link href="/login" style={{ color: '#6366F1', fontWeight: 600 }}>← Back to Sign In</Link>
        </div>
      </div>
    </div>
  )
}
