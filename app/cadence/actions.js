'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function updateCadenceStep({ id, offsetValue, offsetUnit, enabled }) {
  const actor = await requireActor()
  if (offsetValue < 0) return { error: 'Offset cannot be negative.' }

  const sb = createServerClient()
  const { data: before } = await sb.from('cadence_steps').select('*').eq('id', id).maybeSingle()

  const { error } = await sb
    .from('cadence_steps')
    .update({ offset_value: offsetValue, offset_unit: offsetUnit, enabled, updated_by: actor, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }

  await logAudit({ actor, action: 'cadence.update', tableName: 'cadence_steps', rowId: id,
    before: { offset_value: before?.offset_value, offset_unit: before?.offset_unit, enabled: before?.enabled },
    after: { offset_value: offsetValue, offset_unit: offsetUnit, enabled },
    note: `${before?.template_key}: ${before?.offset_value} ${before?.offset_unit} → ${offsetValue} ${offsetUnit}${!enabled ? ' (disabled)' : ''}`,
  })

  revalidatePath('/cadence')
  return { ok: true }
}
