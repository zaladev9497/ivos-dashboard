'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

export async function saveTemplate({ templateKey, body, taskTitle, notes }) {
  const actor = await requireActor()
  const sb = createServerClient()

  const { data: current, error: readErr } = await sb
    .from('message_templates')
    .select('*')
    .eq('template_key', templateKey)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (readErr) return { error: readErr.message }

  const newVersion = (current?.version ?? 0) + 1
  const { company_id, channel } = current ?? {}

  const { data: newRow, error: insertErr } = await sb
    .from('message_templates')
    .insert({ company_id, template_key: templateKey, version: newVersion, channel, body, task_title: taskTitle ?? null, notes: notes ?? null, is_active: true, approved: false })
    .select()
    .single()
  if (insertErr) return { error: insertErr.message }

  if (current?.id) {
    await sb.from('message_templates').update({ is_active: false }).eq('id', current.id)
  }

  await logAudit({ actor, action: 'template.save', tableName: 'message_templates', rowId: newRow.id,
    before: current ? { version: current.version, body: current.body, approved: current.approved } : null,
    after: { version: newVersion, body, approved: false },
    note: `Saved v${newVersion} of ${templateKey}`,
  })

  revalidatePath(`/templates/${encodeURIComponent(templateKey)}`)
  revalidatePath('/templates')
  return { ok: true, version: newVersion }
}

export async function approveTemplate({ templateId, templateKey, approverName }) {
  const actor = await requireActor()
  if (!approverName?.trim()) return { error: 'Approver name is required.' }

  const sb = createServerClient()
  const { data: current } = await sb.from('message_templates').select('approved, version').eq('id', templateId).maybeSingle()
  if (current?.approved) return { error: 'Already approved.' }

  const { error } = await sb.from('message_templates').update({ approved: true }).eq('id', templateId)
  if (error) return { error: error.message }

  await logAudit({ actor, action: 'template.approve', tableName: 'message_templates', rowId: templateId,
    before: { approved: false }, after: { approved: true },
    note: `Approved by ${approverName.trim()} (session: ${actor})`,
  })

  revalidatePath(`/templates/${encodeURIComponent(templateKey)}`)
  return { ok: true }
}
