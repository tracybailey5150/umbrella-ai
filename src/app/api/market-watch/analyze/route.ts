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
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { type, data } = await req.json()

    if (type === 'trends') {
      const { data: keywords } = await admin.from('market_keywords').select('*').eq('org_id', orgId)
      const { data: signals } = await admin.from('trend_topics').select('*').eq('org_id', orgId).order('score', { ascending: false }).limit(20)

      const prompt = `You are a market intelligence analyst. Analyze the following market data and provide a comprehensive trend analysis.

KEYWORDS BEING TRACKED:
${(keywords || []).map((k: any) => `- ${k.keyword} (category: ${k.category || 'General'}, trend score: ${k.trend_score}/100, volume change: ${k.volume_change_pct ?? 'N/A'}%)`).join('\n') || 'No keywords tracked yet.'}

RECENT MARKET SIGNALS:
${(signals || []).map((s: any) => `- [${s.relevance}] ${s.title}: ${s.summary || 'No summary'} (score: ${s.score}, category: ${s.category || 'General'})`).join('\n') || 'No signals recorded yet.'}

${data?.context ? `ADDITIONAL CONTEXT: ${data.context}` : ''}

Provide your analysis as a JSON object with this structure:
{
  "summary": "2-3 sentence executive summary of current market trends",
  "opportunities": ["list of 3-5 market opportunities identified"],
  "risks": ["list of 3-5 market risks or threats"],
  "recommendations": ["list of 3-5 actionable recommendations"],
  "trend_direction": "up" | "down" | "stable" | "mixed",
  "confidence_score": 0-100
}

Respond with ONLY valid JSON, no markdown or explanation.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = (message.content[0] as any).text
      let parsed
      try { parsed = JSON.parse(text) } catch { parsed = { summary: text.slice(0, 500), opportunities: [], risks: [], recommendations: [], trend_direction: 'mixed', confidence_score: 50 } }

      return NextResponse.json({ data: parsed })
    }

    if (type === 'competitor') {
      const competitor = data?.competitor
      if (!competitor) return NextResponse.json({ error: 'competitor data required' }, { status: 400 })

      const prompt = `You are a competitive intelligence analyst. Analyze the following competitor and provide strategic insights.

COMPETITOR:
- Name: ${competitor.name}
- Website: ${competitor.website || 'Unknown'}
- Industry: ${competitor.industry || 'Unknown'}
- Tracking Keywords: ${(competitor.tracking_keywords || []).join(', ') || 'None'}
- Notes: ${competitor.notes || 'None'}

${data?.context ? `ADDITIONAL CONTEXT: ${data.context}` : ''}

Provide your analysis as a JSON object with this structure:
{
  "overview": "2-3 sentence overview of what this competitor likely does and their market position",
  "strengths": ["list of 3-4 likely competitive strengths"],
  "weaknesses": ["list of 3-4 potential weaknesses or gaps"],
  "threats": ["list of 2-3 threats they pose to our business"],
  "opportunities": ["list of 2-3 opportunities we can exploit against them"],
  "market_positioning": "brief description of their likely market positioning strategy",
  "recommended_actions": ["list of 3-4 specific actions to take"]
}

Respond with ONLY valid JSON, no markdown or explanation.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = (message.content[0] as any).text
      let parsed
      try { parsed = JSON.parse(text) } catch { parsed = { overview: text.slice(0, 500), strengths: [], weaknesses: [], threats: [], opportunities: [], market_positioning: '', recommended_actions: [] } }

      return NextResponse.json({ data: parsed })
    }

    if (type === 'report') {
      const [keywordsRes, signalsRes, competitorsRes, alertsRes] = await Promise.all([
        admin.from('market_keywords').select('*').eq('org_id', orgId),
        admin.from('trend_topics').select('*').eq('org_id', orgId).order('score', { ascending: false }).limit(30),
        admin.from('market_competitors').select('*').eq('org_id', orgId),
        admin.from('market_alerts').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(20),
      ])

      const prompt = `You are a senior market intelligence analyst preparing a comprehensive market intelligence report. Analyze ALL of the following data and produce a detailed strategic report.

TRACKED KEYWORDS (${(keywordsRes.data || []).length}):
${(keywordsRes.data || []).map((k: any) => `- ${k.keyword} (${k.category || 'General'}) — Trend: ${k.trend_score}/100, Volume: ${k.volume_change_pct ?? 'N/A'}%`).join('\n') || 'None tracked.'}

MARKET SIGNALS (${(signalsRes.data || []).length}):
${(signalsRes.data || []).map((s: any) => `- [${s.relevance?.toUpperCase()}] ${s.title} — Score: ${s.score}, ${s.summary || ''}`).join('\n') || 'None recorded.'}

COMPETITORS (${(competitorsRes.data || []).length}):
${(competitorsRes.data || []).map((c: any) => `- ${c.name} (${c.industry || 'Unknown'}) — ${c.website || 'no website'}, Keywords: ${(c.tracking_keywords || []).join(', ') || 'none'}`).join('\n') || 'None tracked.'}

RECENT ALERTS (${(alertsRes.data || []).length}):
${(alertsRes.data || []).map((a: any) => `- [${a.severity?.toUpperCase()}] ${a.title}: ${a.description || 'no details'}`).join('\n') || 'None.'}

Produce a comprehensive market intelligence report as a JSON object:
{
  "title": "Market Intelligence Report — [Current Date]",
  "executive_summary": "3-5 sentence high-level summary of the current market landscape",
  "market_trends": {
    "overview": "2-3 paragraphs on current market trends",
    "key_trends": ["list of 4-6 key trends"],
    "trend_direction": "up" | "down" | "stable" | "mixed"
  },
  "competitive_landscape": {
    "overview": "1-2 paragraphs on the competitive environment",
    "key_findings": ["list of 3-5 competitive findings"]
  },
  "keyword_analysis": {
    "overview": "1-2 paragraphs on keyword and search trend analysis",
    "hot_keywords": ["top performing keywords"],
    "declining_keywords": ["keywords losing traction"]
  },
  "opportunities": ["list of 4-6 market opportunities with brief descriptions"],
  "risks": ["list of 4-6 market risks with brief descriptions"],
  "recommendations": ["list of 5-8 prioritized strategic recommendations"],
  "outlook": "2-3 sentence market outlook"
}

Respond with ONLY valid JSON, no markdown or explanation.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = (message.content[0] as any).text
      let parsed
      try { parsed = JSON.parse(text) } catch { parsed = { title: 'Market Intelligence Report', executive_summary: text.slice(0, 1000), market_trends: {}, competitive_landscape: {}, keyword_analysis: {}, opportunities: [], risks: [], recommendations: [], outlook: '' } }

      // Save report to DB
      const reportTitle = parsed.title || `Market Report — ${new Date().toLocaleDateString()}`
      await admin.from('market_reports').insert({
        title: reportTitle,
        report_type: 'full',
        content: text,
        sections: parsed,
        org_id: orgId,
      })

      return NextResponse.json({ data: parsed })
    }

    return NextResponse.json({ error: 'Invalid analysis type. Use: trends, competitor, or report' }, { status: 400 })
  } catch (err: any) {
    console.error('Market watch analysis error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
