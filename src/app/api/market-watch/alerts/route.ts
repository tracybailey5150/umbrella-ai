import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getOrgId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  return data?.org_id
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const alertType = searchParams.get('alert_type')
  const severity = searchParams.get('severity')
  const isRead = searchParams.get('is_read')

  let q = admin.from('market_alerts').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100)
  if (alertType) q = q.eq('alert_type', alertType)
  if (severity) q = q.eq('severity', severity)
  if (isRead === 'true') q = q.eq('is_read', true)
  if (isRead === 'false') q = q.eq('is_read', false)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await admin.from('market_alerts').insert({
    alert_type: body.alert_type || 'custom',
    title: body.title,
    description: body.description || null,
    severity: body.severity || 'info',
    source: body.source || 'manual',
    data: body.data || {},
    org_id: orgId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, ids } = body

  if (action === 'mark_read') {
    const { error } = await admin.from('market_alerts').update({ is_read: true }).in('id', ids).eq('org_id', orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }
  if (action === 'mark_unread') {
    const { error } = await admin.from('market_alerts').update({ is_read: false }).in('id', ids).eq('org_id', orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const bulk = searchParams.get('bulk')

  if (bulk) {
    const ids = bulk.split(',')
    await admin.from('market_alerts').delete().in('id', ids).eq('org_id', orgId)
  } else if (id) {
    await admin.from('market_alerts').delete().eq('id', id).eq('org_id', orgId)
  }

  return NextResponse.json({ success: true })
}
