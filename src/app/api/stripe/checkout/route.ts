import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, PLANS, PlanKey } from '@/lib/stripe'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { plan, orgId, userEmail } = await req.json()
    if (!plan || !orgId || !userEmail) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const planConfig = PLANS[plan as PlanKey]
    if (!planConfig || !planConfig.priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    // Get or create Stripe customer
    const { data: existing } = await admin.from('stripe_customers').select('stripe_customer_id').eq('org_id', orgId).single()
    let customerId = existing?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail, metadata: { org_id: orgId } })
      customerId = customer.id
      await admin.from('stripe_customers').insert({ org_id: orgId, stripe_customer_id: customerId, billing_email: userEmail })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
      metadata: { org_id: orgId, plan },
      subscription_data: { metadata: { org_id: orgId, plan } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
