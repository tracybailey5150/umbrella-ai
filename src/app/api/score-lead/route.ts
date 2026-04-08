import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { leadId, intake, agentInstructions } = await req.json()
    if (!leadId || !intake) return NextResponse.json({ error: 'leadId and intake required' }, { status: 400 })

    const systemPrompt = `You are a lead qualification AI for a business. Your job is to analyze an inbound inquiry and produce a structured qualification assessment.

${agentInstructions ? `Business context: ${agentInstructions}\n` : ''}

Respond with a valid JSON object only, no markdown, no explanation. Format:
{
  "score": <number 0-100>,
  "priority": <"low" | "normal" | "high" | "urgent">,
  "summary": "<2-3 sentence scope summary>",
  "qualification": {
    "project_type": "<type of work>",
    "urgency": "<immediate | soon | planning | unknown>",
    "budget_signals": "<any budget mentions or signals>",
    "key_details": "<important scope details>",
    "recommended_action": "<what the sales team should do next>"
  }
}

Scoring guide:
- 80-100: Clear budget, urgent need, specific scope, strong buying signals
- 60-79: Reasonable scope, some urgency, decent intent
- 40-59: Vague but real need, worth a follow-up
- 20-39: Incomplete info, needs more qualification
- 0-19: Spam, test, or completely unclear`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: `Qualify this lead inquiry:\n\n${intake}` }],
      system: systemPrompt,
    })

    const text = (message.content[0] as any).text
    let parsed: any = {}
    try { parsed = JSON.parse(text) } catch { parsed = { score: 30, summary: text.slice(0, 200) } }

    const score = Math.min(100, Math.max(0, parsed.score ?? 30))
    const summary = parsed.summary ?? null
    const priority = parsed.priority ?? 'normal'
    const qualification = parsed.qualification ?? {}

    // Update lead
    await supabase.from('leads').update({
      score, priority, scope_summary: summary, qualification,
      updated_at: new Date().toISOString(),
    }).eq('id', leadId)

    // Log activity
    const { data: lead } = await supabase.from('leads').select('org_id').eq('id', leadId).single()
    if (lead) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId, org_id: lead.org_id, type: 'ai_score',
        content: `AI scored this lead: ${score}/100 — ${priority} priority`,
        meta: { score, priority, qualification },
      })
    }

    return NextResponse.json({ score, priority, summary, qualification })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
