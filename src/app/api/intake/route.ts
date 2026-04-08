import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: return agent config for public intake page
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const { data: agent } = await supabase
    .from('intake_agents')
    .select('id,name,vertical,greeting,ai_instructions')
    .eq('embed_key', agentId)
    .eq('is_active', true)
    .single()

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  return NextResponse.json({ agent })
}

// POST: receive intake submission, store lead, kick off AI scoring
export async function POST(req: NextRequest) {
  try {
    const { agentId, name, email, phone, company, needs } = await req.json()
    if (!agentId || !name || !email) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // Get agent
    const { data: agent } = await supabase
      .from('intake_agents')
      .select('id,org_id,name,vertical,ai_instructions')
      .eq('embed_key', agentId)
      .eq('is_active', true)
      .single()

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    // Create lead
    const { data: lead, error } = await supabase.from('leads').insert({
      org_id: agent.org_id,
      agent_id: agent.id,
      name, email, phone: phone || null, company: company || null,
      raw_intake: needs,
      status: 'new',
      source: 'intake_form',
      priority: 'normal',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log intake activity
    await supabase.from('lead_activities').insert({
      lead_id: lead.id, org_id: agent.org_id, type: 'intake',
      content: `Intake submitted via ${agent.name}`,
      meta: { agent_id: agent.id, vertical: agent.vertical },
    })

    // Trigger AI scoring asynchronously (fire and forget)
    fetch(`${req.nextUrl.origin}/api/score-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, intake: needs, agentInstructions: agent.ai_instructions }),
    }).catch(() => {})

    return NextResponse.json({ success: true, leadId: lead.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
