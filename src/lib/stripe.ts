import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    })
  }
  return _stripe
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    limits: { intakeAgents: 1, leads: 50, buyerAgents: 0, priceWatchItems: 0 },
    features: ['1 intake agent', '50 leads/mo', 'AI lead scoring', 'Follow-up queue'],
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    limits: { intakeAgents: 5, leads: -1, buyerAgents: 1, priceWatchItems: 10 },
    features: ['5 intake agents', 'Unlimited leads', '1 buyer agent', '10 price watch items', 'Resend email automation', 'Priority support'],
  },
  business: {
    name: 'Business',
    price: 149,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || '',
    limits: { intakeAgents: -1, leads: -1, buyerAgents: -1, priceWatchItems: -1 },
    features: ['Unlimited intake agents', 'Unlimited leads', 'Unlimited buyer agents', 'Unlimited price watch', 'White-label intake forms', 'API access', 'Dedicated support'],
  },
} as const

export type PlanKey = keyof typeof PLANS
