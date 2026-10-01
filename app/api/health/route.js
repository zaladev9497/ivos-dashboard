import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Liveness/readiness probe for uptime monitors. Public, so it returns no details.
export async function GET() {
  try {
    const sb = createServerClient()
    const { error } = await sb.from('business_calendar').select('company_id', { head: true, count: 'exact' }).limit(1)
    if (error) throw error
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ status: 'degraded' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
