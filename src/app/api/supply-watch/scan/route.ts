import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPriceAlert } from '@/lib/email'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Simulated market movement ranges per category (realistic volatility)
const VOLATILITY: Record<string, { min: number; max: number }> = {
  materials:         { min: -4,  max: 6  },  // lumber/steel can spike
  labor:             { min: -1,  max: 3  },  // wages trend up slowly
  fuel_logistics:    { min: -8,  max: 10 },  // fuel is volatile
  equipment_rental:  { min: -2,  max: 4  },  // rental rates shift seasonally
  regulatory:        { min: 0,   max: 5  },  // fees/permits only go up
}

function simulateMove(category: string, currentPrice: number): { newPrice: number; changePct: number; headline: string } {
  const vol = VOLATILITY[category] || { min: -3, max: 3 }
  const changePct = parseFloat((Math.random() * (vol.max - vol.min) + vol.min).toFixed(2))
  const newPrice = parseFloat((currentPrice * (1 + changePct / 100)).toFixed(2))

  const headlines: Record<string, string[]> = {
    materials: ['Lumber futures up on housing demand', 'Steel prices stabilize after tariff news', 'Copper rises on global supply constraints', 'Material costs shift with seasonal demand'],
    labor: ['Prevailing wage rates revised upward', 'Skilled trades shortage pushes rates higher', 'Labor market tightening in construction sector', 'Union negotiations affect local rates'],
    fuel_logistics: ['Diesel prices react to crude oil movements', 'Delivery surcharges adjusted by major carriers', 'Fuel hedging costs impacting logistics', 'Regional fuel prices diverge'],
    equipment_rental: ['Equipment utilization rates near peak', 'Crane and lift rental rates shift with demand', 'Seasonal equipment availability tightens', 'Rental market adjusts post-construction season'],
    regulatory: ['Municipality updates permit fee schedule', 'New inspection requirements add to project costs', 'Code changes increase compliance costs', 'Impact fees adjusted by county assessors'],
  }
  const pool = headlines[category] || ['Market conditions updated']
  const headline = pool[Math.floor(Math.random() * pool.length)]

  return { newPrice, changePct, headline }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await req.json()
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const { data: items } = await admin.from('price_watch_items').select('*').eq('org_id', orgId).eq('is_active', true)
    if (!items?.length) return NextResponse.json({ data: { scanned: 0, alerts: 0 } })

    // Get user email for alerts
    const { data: profile } = await admin.from('profiles').select('id').eq('org_id', orgId).limit(1).single()
    const { data: userRecord } = await admin.auth.admin.getUserById(profile?.id || '')
    const userEmail = userRecord?.user?.email

    let alertCount = 0
    const signals = []

    for (const item of items) {
      const basePrice = item.current_price || 100
      const { newPrice, changePct, headline } = simulateMove(item.category, basePrice)
      const absChange = Math.abs(changePct)
      const signalType = Math.abs(changePct) < 0.5 ? 'stable' : changePct > 0 ? 'increase' : 'decrease'
      const isAlert = absChange >= (item.alert_threshold_pct || 5)

      signals.push({
        org_id: orgId,
        item_id: item.id,
        category: item.category,
        signal_type: isAlert ? 'alert' : signalType,
        old_price: basePrice,
        new_price: newPrice,
        change_pct: changePct,
        headline,
      })

      // Update item
      await admin.from('price_watch_items').update({
        previous_price: basePrice,
        current_price: newPrice,
        price_change_pct: changePct,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', item.id)

      if (isAlert) {
        alertCount++
        if (userEmail) {
          await sendPriceAlert(userEmail, item.name, item.category, changePct, newPrice, item.unit || '').catch(() => {})
        }
      }
    }

    await admin.from('price_watch_signals').insert(signals)

    return NextResponse.json({ data: { scanned: items.length, alerts: alertCount } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
