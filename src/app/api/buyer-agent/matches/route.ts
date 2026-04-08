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

// GET: list matches for a config, with optional status filter
export async function GET(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const configId = searchParams.get('configId')
  const status = searchParams.get('status')

  let query = admin.from('buyer_matches').select('*')

  if (configId) {
    // Verify config belongs to org
    const { data: cfg } = await admin.from('buyer_agent_configs').select('id').eq('id', configId).eq('org_id', orgId).single()
    if (!cfg) return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    query = query.eq('config_id', configId)
  } else {
    // Get all configs for this org, then get matches for those
    const { data: configs } = await admin.from('buyer_agent_configs').select('id').eq('org_id', orgId)
    if (!configs || configs.length === 0) return NextResponse.json({ data: [] })
    query = query.in('config_id', configs.map(c => c.id))
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data || [] })
}

// PATCH: update match status or notes
export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: any = {}
  if (status !== undefined) updates.status = status
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await admin.from('buyer_matches').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// DELETE: remove a match
export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await admin.from('buyer_matches').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
