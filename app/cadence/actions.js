'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

const UNITS = ['minutes', 'calendar_days', 'business_days', 'months']
const MAX_OFFSET = 100000

function checkOffset(value, unit, label) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) return `${label} must be a whole number.`
  if (value < 0) return `${label} cannot be negative.`
  if (value > MAX_OFFSET) return `${label} is too large.`
  if (!UNITS.includes(unit)) return `${label} has an unknown unit.`
  return null
}

export async function updateCadenceStep({ id, offsetValue, offsetUnit, enabled, demoOffsetValue, demoOffsetUnit }) {
  const actor = await requireActor()
  if (!id) return { error: 'Missing step id.' }
  if (typeof enabled !== 'boolean') return { error: 'Enabled must be on or off.' }
  const offsetErr = checkOffset(offsetValue, offsetUnit, 'Offset')
  if (offsetErr) return { error: offsetErr }
  if (demoOffsetValue !== undefined || demoOffsetUnit !== undefined) {
    const demoErr = checkOffset(demoOffsetValue, demoOffsetUnit, 'Demo offset')
    if (demoErr) return { error: demoErr }
  }

  const sb = createServerClient()
  const { data: before } = await sb.from('cadence_steps').select('*').eq('id', id).maybeSingle()
  if (!before) return { error: 'Cadence step not found.' }

  const patch = {
    offset_value: offsetValue, offset_unit: offsetUnit, enabled,
    updated_by: actor, updated_at: new Date().toISOString(),
  }
  if (demoOffsetValue !== undefined) patch.demo_offset_value = demoOffsetValue
  if (demoOffsetUnit !== undefined) patch.demo_offset_unit = demoOffsetUnit

  const { error } = await sb.from('cadence_steps').update(patch).eq('id', id)
  if (error) return { error: error.message }

  await logAudit({ actor, action: 'cadence.update', tableName: 'cadence_steps', rowId: id,
    before: { offset_value: before?.offset_value, offset_unit: before?.offset_unit, enabled: before?.enabled },
    after: { offset_value: offsetValue, offset_unit: offsetUnit, enabled },
    note: `${before?.template_key}: ${before?.offset_value} ${before?.offset_unit} → ${offsetValue} ${offsetUnit}${!enabled ? ' (disabled)' : ''}`,
  })

  revalidatePath('/cadence')
  return { ok: true }
}
