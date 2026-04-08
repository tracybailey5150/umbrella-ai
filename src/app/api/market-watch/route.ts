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
  const type = searchParams.get('type') || 'signals'

  if (type === 'signals') {
    const { data } = await admin.from('trend_topics').select('*').eq('org_id', orgId).order('score', { ascending: false }).limit(50)
    return NextResponse.json({ data: data || [] })
  }
  if (type === 'competitors') {
    const { data } = await admin.from('market_competitors').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    return NextResponse.json({ data: data || [] })
  }
  if (type === 'keywords') {
    const { data } = await admin.from('market_keywords').select('*').eq('org_id', orgId).order('trend_score', { ascending: false })
    return NextResponse.json({ data: data || [] })
  }
  if (type === 'alerts') {
    const { data } = await admin.from('market_alerts').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100)
    return NextResponse.json({ data: data || [] })
  }
  if (type === 'reports') {
    const { data } = await admin.from('market_reports').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(20)
    return NextResponse.json({ data: data || [] })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { type, ...payload } = body

  if (type === 'signal') {
    const { data, error } = await admin.from('trend_topics').insert({ ...payload, org_id: orgId, score: payload.score ?? 50 }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  if (type === 'competitor') {
    const { data, error } = await admin.from('market_competitors').insert({ ...payload, org_id: orgId }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  if (type === 'keyword') {
    const { data, error } = await admin.from('market_keywords').insert({ ...payload, org_id: orgId }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }
  if (type === 'report') {
    const { data, error } = await admin.from('market_reports').insert({ ...payload, org_id: orgId }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const type = searchParams.get('type')
  if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 })

  const table = type === 'competitor' ? 'market_competitors' : type === 'keyword' ? 'market_keywords' : type === 'signal' ? 'trend_topics' : type === 'report' ? 'market_reports' : null
  if (!table) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  await admin.from(table).delete().eq('id', id).eq('org_id', orgId)
  return NextResponse.json({ success: true })
}
