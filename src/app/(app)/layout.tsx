'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard',     label: 'Dashboard',      icon: '◼' },
  { href: '/leads',         label: 'Leads',          icon: '🎯' },
  { href: '/intake',        label: 'Intake Agents',  icon: '📥' },
  { href: '/follow-ups',    label: 'Follow-Ups',     icon: '🔔' },
  { href: '/buyer-agent',   label: 'Buyer Agent',    icon: '🔍' },
  { href: '/supply-watch',  label: 'Supply Watch',   icon: '📊' },
  { href: '/market-watch',  label: 'Market Watch',   icon: '📡' },
  { href: '/billing',       label: 'Billing',        icon: '💳' },
  { href: '/settings',      label: 'Settings',       icon: '⚙' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserEmail(data.user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, organizations(name)')
        .eq('id', data.user.id)
        .single()
      if (profile?.organizations) {
        setOrgName((profile.organizations as any).name ?? '')
      }
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const s = {
    shell: { display: 'flex', minHeight: '100vh', background: '#060B18' } as React.CSSProperties,
    sidebar: {
      width: collapsed ? '60px' : '220px',
      background: '#0C1525',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column' as const,
      transition: 'width 0.2s', flexShrink: 0, overflow: 'hidden',
    } as React.CSSProperties,
    sidebarTop: {
      padding: collapsed ? '16px 12px' : '20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: '10px',
    } as React.CSSProperties,
    logoWrap: { flex: 1, overflow: 'hidden' } as React.CSSProperties,
    logoLabel: { fontSize: '11px', fontWeight: 800, color: '#6366F1', letterSpacing: '0.1em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const } as React.CSSProperties,
    orgName: { fontSize: '12px', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    nav: { flex: 1, padding: '12px 0' } as React.CSSProperties,
    navLink: (active: boolean): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: collapsed ? '10px 18px' : '10px 16px',
      fontSize: '13px', fontWeight: active ? 600 : 400,
      color: active ? '#F1F5F9' : '#64748B',
      background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
      borderLeft: active ? '2px solid #6366F1' : '2px solid transparent',
      cursor: 'pointer', whiteSpace: 'nowrap' as const, overflow: 'hidden',
      textDecoration: 'none', transition: 'all 0.15s',
    }),
    icon: { fontSize: '14px', flexShrink: 0 } as React.CSSProperties,
    sidebarBottom: { padding: collapsed ? '12px' : '16px', borderTop: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    email: { fontSize: '11px', color: '#475569', marginBottom: '8px', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    signOutBtn: { width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#64748B', borderRadius: '6px', padding: '7px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' as const } as React.CSSProperties,
    collapseBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px', flexShrink: 0 } as React.CSSProperties,
    main: { flex: 1, overflow: 'auto' } as React.CSSProperties,
  }

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          {!collapsed && (
            <div style={s.logoWrap}>
              <div style={s.logoLabel}>Umbrella AI</div>
              {orgName && <div style={s.orgName}>{orgName}</div>}
            </div>
          )}
          <button style={s.collapseBtn} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <nav style={s.nav}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={s.navLink(pathname === item.href || pathname.startsWith(item.href + '/'))}>
              <span style={s.icon}>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          ))}
        </nav>
        <div style={s.sidebarBottom}>
          {!collapsed && <div style={s.email}>{userEmail}</div>}
          <button style={s.signOutBtn} onClick={handleSignOut}>
            {collapsed ? '↩' : 'Sign Out'}
          </button>
          {!collapsed && <div style={{ fontSize: '9px', color: '#475569', textAlign: 'center', marginTop: '8px', lineHeight: 1.4 }}>&copy; 2026 Umbrella AI&trade; · Tracy Bailey.<br />All rights reserved.</div>}
        </div>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  )
}
