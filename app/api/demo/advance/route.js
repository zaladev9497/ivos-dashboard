import { NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'

export async function POST() {
  const actor = await getActor()
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.N8N_POLLER_RUN_URL
  if (!url) return NextResponse.json({ error: 'N8N_POLLER_RUN_URL is not configured' }, { status: 500 })

  try {
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) return NextResponse.json({ error: `n8n returned ${res.status}` }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e?.message ?? 'Failed to reach n8n' }, { status: 502 })
  }
}
