import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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

export async function POST(req: NextRequest) {
  try {
    const orgId = await getOrgId()
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { configId } = await req.json()
    if (!configId) return NextResponse.json({ error: 'configId required' }, { status: 400 })

    // Fetch the config
    const { data: config, error: cfgErr } = await admin
      .from('buyer_agent_configs')
      .select('*')
      .eq('id', configId)
      .eq('org_id', orgId)
      .single()

    if (cfgErr || !config) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    // Build the search prompt
    const requirements = (config.requirements || [])
      .map((r: { key: string; value: string }) => `- ${r.key}: ${r.value}`)
      .join('\n')

    const sources = (config.search_sources || ['marketplace', 'listings', 'inventory']).join(', ')

    const prompt = `You are a procurement and sourcing agent. Given the following search criteria, generate 6-8 realistic matching results that someone might find on marketplaces, listing sites, or inventory databases.

Search Criteria:
- Looking for: ${config.name}
- Category: ${config.category}
- Description: ${config.description || 'No additional description'}
- Budget Range: $${config.budget_min || 0} - $${config.budget_max || 'unlimited'}
- Location Preference: ${config.location || 'Any'}
- Search Sources: ${sources}
${requirements ? `- Requirements:\n${requirements}` : ''}

For each match, generate realistic data including:
- title: A specific, realistic listing title
- description: 2-3 sentences describing the item/service
- price: A realistic price (as number, no currency symbol)
- location: A realistic location (city, state)
- source: Which source it came from (one of: ${sources})
- source_url: A plausible URL
- match_score: Score 0-100 based on how well it matches ALL criteria (budget fit, location match, requirements match)
- match_reasons: Array of strings explaining why this is a match or partial match

Make results varied - some should be excellent matches (80-100), some moderate (60-79), and a few partial matches (40-59). Be realistic about pricing and availability.

Respond with ONLY a valid JSON array, no markdown, no explanation. Example format:
[{"title":"...","description":"...","price":25000,"location":"Dallas, TX","source":"marketplace","source_url":"https://example.com/listing/123","match_score":85,"match_reasons":["Within budget range","Location match","Meets brand requirement"]}]`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a procurement AI agent. Always respond with valid JSON only. No markdown code fences, no explanatory text.',
    })

    const text = (message.content[0] as any).text
    let matches: any[] = []
    try {
      // Handle potential markdown code fences
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      matches = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: text.slice(0, 500) }, { status: 500 })
    }

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ error: 'No matches generated' }, { status: 500 })
    }

    // Save matches to buyer_matches table
    const rows = matches.map((m: any) => ({
      config_id: configId,
      title: m.title || 'Untitled',
      description: m.description || null,
      match_score: Math.min(100, Math.max(0, m.match_score || 50)),
      match_reasons: m.match_reasons || [],
      source: m.source || 'marketplace',
      source_url: m.source_url || null,
      price: m.price || null,
      location: m.location || null,
      image_url: m.image_url || null,
      status: 'new',
      notes: null,
    }))

    const { error: insertErr } = await admin.from('buyer_matches').insert(rows)
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    // Update config: last_run_at, match_count, search_history
    const history = config.search_history || []
    history.unshift({ ran_at: new Date().toISOString(), results: matches.length })
    if (history.length > 20) history.length = 20

    await admin.from('buyer_agent_configs').update({
      last_run_at: new Date().toISOString(),
      match_count: (config.match_count || 0) + matches.length,
      search_history: history,
      updated_at: new Date().toISOString(),
    }).eq('id', configId)

    // Return matches
    const { data: saved } = await admin
      .from('buyer_matches')
      .select('*')
      .eq('config_id', configId)
      .order('match_score', { ascending: false })

    return NextResponse.json({ data: { matched: matches.length, matches: saved || rows } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
