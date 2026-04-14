import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured (STRIPE_SECRET_KEY missing)' }, { status: 503 })
  }
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const getOrgId = (meta: Stripe.Metadata | null) => meta?.org_id
  const getPlan = (meta: Stripe.Metadata | null): string => meta?.plan || 'pro'

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = getOrgId(session.metadata)
      const plan = getPlan(session.metadata)
      if (!orgId) break
      await Promise.all([
        admin.from('organizations').update({ plan }).eq('id', orgId),
        admin.from('subscriptions').upsert({
          org_id: orgId,
          stripe_subscription_id: session.subscription as string,
          plan,
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id' }),
      ])
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = getOrgId(sub.metadata)
      const plan = getPlan(sub.metadata)
      if (!orgId) break
      const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status
      await Promise.all([
        admin.from('organizations').update({ plan: status === 'active' ? plan : 'free' }).eq('id', orgId),
        admin.from('subscriptions').upsert({
          org_id: orgId,
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price.id,
          plan,
          status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id' }),
      ])
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = getOrgId(sub.metadata)
      if (!orgId) break
      await Promise.all([
        admin.from('organizations').update({ plan: 'free' }).eq('id', orgId),
        admin.from('subscriptions').upsert({
          org_id: orgId,
          stripe_subscription_id: sub.id,
          plan: 'free',
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id' }),
      ])
      break
    }
  }

  return NextResponse.json({ received: true })
}
