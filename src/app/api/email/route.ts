import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend } from '@/lib/email'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { orgId, leadId, to, subject, html, template } = await req.json()
    if (!to || !subject || !html) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data, error } = await resend.emails.send({
      from: 'Umbrella AI <noreply@umbrella-ai.com>',
      to,
      subject,
      html,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (orgId) {
      await admin.from('email_logs').insert({
        org_id: orgId,
        lead_id: leadId || null,
        recipient: to,
        subject,
        template: template || 'custom',
        status: 'sent',
        resend_id: data?.id,
      })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
