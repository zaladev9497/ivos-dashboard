'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function updateBusinessCalendar(fields) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { data: before } = await sb
    .from('business_calendar')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (!before) return { error: 'Business calendar row not found.' }

  const { error } = await sb
    .from('business_calendar')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', before.id)

  if (error) return { error: error.message }

  const changedKeys = Object.keys(fields).filter(
    k => JSON.stringify(before[k]) !== JSON.stringify(fields[k])
  )

  await logAudit({
    actor,
    action: 'settings.update',
    tableName: 'business_calendar',
    rowId: before.id,
    before: Object.fromEntries(changedKeys.map(k => [k, before[k]])),
    after: Object.fromEntries(changedKeys.map(k => [k, fields[k]])),
    note: changedKeys.map(k => `${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(fields[k])}`).join('; '),
  })

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}
