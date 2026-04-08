import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#6366F1', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '24px' }}>
          Umbrella AI Platform
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#F1F5F9', lineHeight: 1.15, marginBottom: '20px' }}>
          AI agents that capture,<br />qualify, and convert.
        </h1>
        <p style={{ fontSize: '16px', color: '#64748B', lineHeight: 1.7, marginBottom: '40px' }}>
          Faster response. Captured revenue. Better qualification.<br />
          Persistent search. Early opportunity detection.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" style={{ background: '#6366F1', color: '#fff', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}>
            Sign In
          </Link>
          <Link href="/signup" style={{ background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
