'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function acknowledgeException({ id }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { error } = await sb
    .from('operations_exceptions')
    .update({ state: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by: actor })
    .eq('id', id)
    .eq('state', 'open')

  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'exception.acknowledge', tableName: 'operations_exceptions', rowId: id,
    before: { state: 'open' }, after: { state: 'acknowledged' }, note: 'Acknowledged via dashboard',
  })

  revalidatePath('/ops')
  return { ok: true }
}

export async function resolveException({ id, note }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { error } = await sb
    .from('operations_exceptions')
    .update({ state: 'resolved', resolved_at: new Date().toISOString(), resolved_by: actor, resolution_note: note?.trim() || null })
    .eq('id', id)
    .in('state', ['open', 'acknowledged'])

  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'exception.resolve', tableName: 'operations_exceptions', rowId: id,
    before: {}, after: { state: 'resolved' }, note: note?.trim() || 'Resolved via dashboard',
  })

  revalidatePath('/ops')
  return { ok: true }
}

export async function retryScheduledMessage({ id }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { data: before } = await sb
    .from('scheduled_messages')
    .select('template_key, lead_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await sb
    .from('scheduled_messages')
    .update({ state: 'pending', error_message: null, scheduled_for: new Date().toISOString() })
    .eq('id', id)
    .eq('state', 'failed')

  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'scheduled_message.retry', tableName: 'scheduled_messages', rowId: id,
    before: { state: 'failed' }, after: { state: 'pending' },
    note: `Retried ${before?.template_key} for lead ${before?.lead_id}`,
  })

  revalidatePath('/ops')
  return { ok: true }
}
