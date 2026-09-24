'use server'
import { requireActor } from '@/lib/auth'

export async function triggerDemoAdvance() {
  await requireActor()

  const url = process.env.N8N_POLLER_RUN_URL
  if (!url) {
    return { error: 'N8N_POLLER_RUN_URL is not set — add it to your Vercel environment variables and redeploy.' }
  }

  try {
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) return { error: `n8n returned ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { error: e?.message ?? 'Could not reach n8n' }
  }
}
