'use server'
import { revalidatePath } from 'next/cache'
import { requireActor } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

const MAX_BODY = 1600 // 10 SMS segments; hard stop against accidental pastes
const MAX_TITLE = 200
const MAX_NOTES = 2000

// Placeholders must be balanced and well formed: {{first_name}} ok, {{first_name} or {{ }} not.
function placeholderProblem(body) {
  const open = (body.match(/\{\{/g) ?? []).length
  const close = (body.match(/\}\}/g) ?? []).length
  if (open !== close) return 'Placeholders are unbalanced — every {{ needs a matching }}.'
  if (/\{\{\s*\}\}/.test(body)) return 'There is an empty placeholder {{ }}.'
  for (const m of body.matchAll(/\{\{([^}]*)\}\}/g)) {
    if (!/^\s*[a-zA-Z0-9_]+\s*$/.test(m[1])) return `Placeholder ${m[0]} has invalid characters — use letters, numbers and underscores only.`
  }
  return null
}

export async function saveTemplate({ templateKey, body, taskTitle, notes }) {
  const actor = await requireActor()
  if (typeof templateKey !== 'string' || !templateKey) return { error: 'Missing template key.' }
  if (typeof body !== 'string' || !body.trim()) return { error: 'The message body cannot be empty.' }
  if (body.length > MAX_BODY) return { error: `The message body is too long (max ${MAX_BODY} characters).` }
  const placeholderErr = placeholderProblem(body)
  if (placeholderErr) return { error: placeholderErr }
  if (taskTitle && String(taskTitle).length > MAX_TITLE) return { error: `Task title is too long (max ${MAX_TITLE}).` }
  if (notes && String(notes).length > MAX_NOTES) return { error: `Notes are too long (max ${MAX_NOTES}).` }
  const sb = createServerClient()

  const { data: current, error: readErr } = await sb
    .from('message_templates')
    .select('*')
    .eq('template_key', templateKey)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (readErr) return { error: readErr.message }

  if (!current) return { error: 'Template not found — new templates cannot be created from the dashboard.' }
  if (body === current.body && (taskTitle ?? null) === (current.task_title ?? null)) return { error: 'No changes to save.' }

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
  const { data: current } = await sb.from('message_templates').select('approved, version, is_active, template_key').eq('id', templateId).maybeSingle()
  if (!current) return { error: 'Template not found.' }
  if (current.template_key !== templateKey) return { error: 'Template does not match.' }
  if (current.approved) return { error: 'Already approved.' }
  if (!current.is_active) return { error: 'Only the current version can be approved — reload the page.' }

  const { error } = await sb.from('message_templates').update({ approved: true }).eq('id', templateId)
  if (error) return { error: error.message }

  await logAudit({ actor, action: 'template.approve', tableName: 'message_templates', rowId: templateId,
    before: { approved: false }, after: { approved: true },
    note: `Approved by ${approverName.trim()} (session: ${actor})`,
  })

  revalidatePath(`/templates/${encodeURIComponent(templateKey)}`)
  return { ok: true }
}
