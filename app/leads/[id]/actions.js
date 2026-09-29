'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'
import { triggerDemoAdvance } from '@/app/demo-actions'

export async function pauseJourney({ journeyId, reason, pausedUntil }) {
  const actor = await requireActor()
  if (!reason?.trim()) return { error: 'A pause reason is required.' }
  const sb = createServerClient()

  const { data: before } = await sb.from('journeys').select('state, lead_id').eq('id', journeyId).maybeSingle()
  if (before?.state === 'paused') return { error: 'Journey is already paused.' }

  const update = { state: 'paused', paused_reason: reason.trim(), updated_at: new Date().toISOString() }
  if (pausedUntil) update.paused_until = pausedUntil

  const { error } = await sb.from('journeys').update(update).eq('id', journeyId)
  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'journey.pause', tableName: 'journeys', rowId: journeyId,
    before: { state: before?.state }, after: { state: 'paused', paused_reason: reason.trim() },
    note: `Paused: ${reason.trim()}${pausedUntil ? ` until ${pausedUntil}` : ''}`,
  })

  revalidatePath(`/leads/${before?.lead_id}`)
  return { ok: true }
}

export async function resumeJourney({ journeyId }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { data: before } = await sb.from('journeys').select('state, lead_id').eq('id', journeyId).maybeSingle()
  if (before?.state !== 'paused') return { error: 'Journey is not paused.' }

  const { error } = await sb.from('journeys').update({
    state: 'active', paused_reason: null, paused_until: null, updated_at: new Date().toISOString(),
  }).eq('id', journeyId)
  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'journey.resume', tableName: 'journeys', rowId: journeyId,
    before: { state: 'paused' }, after: { state: 'active' }, note: 'Resumed by dashboard',
  })

  revalidatePath(`/leads/${before?.lead_id}`)
  return { ok: true }
}

export async function cancelScheduledMessage({ messageId, reason }) {
  const actor = await requireActor()
  if (!reason?.trim()) return { error: 'A cancellation reason is required.' }
  const sb = createServerClient()

  const { data: before } = await sb
    .from('scheduled_messages')
    .select('state, lead_id, template_key')
    .eq('id', messageId)
    .maybeSingle()

  if (!before) return { error: 'Scheduled message not found.' }
  if (before.state !== 'pending') return { error: `Cannot cancel a message in state: ${before.state}` }

  const { error } = await sb.from('scheduled_messages').update({
    state: 'cancelled',
    suppression_reason: reason.trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', messageId)
  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'scheduled_message.cancel', tableName: 'scheduled_messages', rowId: messageId,
    before: { state: 'pending' }, after: { state: 'cancelled' },
    note: `Cancelled ${before.template_key}: ${reason.trim()}`,
  })

  revalidatePath(`/leads/${before.lead_id}`)
  return { ok: true }
}

export async function handBackToBot({ conversationId, leadId }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { data: before } = await sb
    .from('conversations')
    .select('human_state')
    .eq('id', conversationId)
    .maybeSingle()

  if (!before) return { error: 'Conversation not found.' }
  if (before.human_state !== 'human_takeover') return { error: 'Conversation is not in human takeover state.' }

  const { error } = await sb.from('conversations').update({
    human_state: 'bot', updated_at: new Date().toISOString(),
  }).eq('id', conversationId)
  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'conversation.hand_back', tableName: 'conversations', rowId: conversationId,
    before: { human_state: 'human_takeover' }, after: { human_state: 'bot' },
    note: 'Handed back to bot via dashboard',
  })

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

// Demo/testing: make a pending message due right now and fire the n8n poller.
export async function sendMessageNow({ messageId }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { data: before } = await sb
    .from('scheduled_messages')
    .select('state, lead_id, template_key, scheduled_for')
    .eq('id', messageId)
    .maybeSingle()

  if (!before) return { error: 'Scheduled message not found.' }
  if (before.state !== 'pending') return { error: `Cannot send a message in state: ${before.state}` }

  const now = new Date().toISOString()
  const { error } = await sb.from('scheduled_messages').update({
    scheduled_for: now, updated_at: now,
  }).eq('id', messageId)
  if (error) return { error: error.message }

  await logAudit({
    actor, action: 'scheduled_message.send_now', tableName: 'scheduled_messages', rowId: messageId,
    before: { scheduled_for: before.scheduled_for }, after: { scheduled_for: now },
    note: `Send-now (demo) for ${before.template_key}`,
  })

  const trig = await triggerDemoAdvance()
  if (trig?.error) return { error: `Message marked due, but poller trigger failed: ${trig.error}` }

  revalidatePath(`/leads/${before.lead_id}`)
  return { ok: true }
}
