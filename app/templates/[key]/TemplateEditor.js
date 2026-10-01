'use client'
import { useState, useDeferredValue } from 'react'
import Badge from '@/components/Badge'
import { formatDate, templateLabel } from '@/lib/utils'
import { smsInfo, typographicWarnings, validateMergeFields, applyPreview } from '@/lib/sms'
import { saveTemplate, approveTemplate } from './actions'

const TASK_CHANNELS = new Set(['task', 'internal'])

// ─── SMS Counter ──────────────────────────────────────────────────────────────
function SmsCounter({ body }) {
  const info = smsInfo(body)
  const warnings = typographicWarnings(body)
  const { invalid } = validateMergeFields(body)

  const segColor =
    info.segments >= 3
      ? '[color:var(--tone-neg-ink)]'
      : info.segments === 2
        ? '[color:var(--tone-warn-ink)]'
        : '[color:var(--tone-pos-ink)]'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="[color:var(--ink-muted)]">Encoding: <strong className="[color:var(--ink)]">{info.encoding}</strong></span>
        <span className="[color:var(--ink-muted)]">Characters: <strong className="[color:var(--ink)]">{info.length}</strong></span>
        <span className={`font-semibold ${segColor}`}>{info.segments} segment{info.segments !== 1 ? 's' : ''}</span>
        <span className="[color:var(--ink-faint)]">{info.remaining >= 0 ? `${info.remaining} remaining in last segment` : `${Math.abs(info.remaining)} over capacity`}</span>
      </div>
      {warnings.map((w, i) => (
        <div key={i} className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          ⚠ {w}
        </div>
      ))}
      {invalid.length > 0 && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          Unknown merge fields (will be rejected at send time): {invalid.map(f => `{{${f}}}`).join(', ')}
        </div>
      )}
    </div>
  )
}

// ─── Preview panel ─────────────────────────────────────────────────────────────
function Preview({ body, channel }) {
  const preview = applyPreview(body)
  const isSms = channel === 'sms'
  return (
    <div className="h-full rounded-[9px] border p-3.5 [border-color:var(--rule)] [background:var(--paper-sunken)]">
      <p className="eyebrow mb-2">Preview</p>
      {isSms ? (
        <div className="flex justify-end">
          <div className="max-w-xs whitespace-pre-wrap rounded-2xl rounded-br-sm px-3 py-2 text-[12.5px] leading-relaxed [background:var(--accent)] [color:var(--on-signal)]">
            {preview || <span className="opacity-40 italic">Start typing…</span>}
          </div>
        </div>
      ) : (
        <div className="whitespace-pre-wrap rounded-md border px-3 py-2 text-[12.5px] leading-relaxed [border-color:var(--rule-faint)] [background:var(--paper-raised)] [color:var(--ink-secondary)]">
          {preview || <span className="italic [color:var(--ink-faint)]">Start typing…</span>}
        </div>
      )}
    </div>
  )
}

// ─── History ──────────────────────────────────────────────────────────────────
function HistoryPanel({ history, auditLogs }) {
  const [open, setOpen] = useState(false)
  if (history.length <= 1) return null
  return (
    <div className="surface overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 eyebrow transition-colors hover:[background:var(--paper-hover)]"
      >
        <span>Version history ({history.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="divide-y [border-color:var(--rule-faint)]">
          {history.map(h => {
            const audit = auditLogs.find(a => a.row_id === h.id)
            return (
              <div key={h.id} className="px-3 py-2 text-sm">
                <div className="flex items-center gap-3 mb-1">
                  <span className="mono text-[11.5px] [color:var(--ink-muted)]">v{h.version}</span>
                  {h.is_active && <Badge label="current" status="sent" />}
                  {h.approved ? <Badge label="approved" status="sent" /> : <Badge label="not approved" status="failed" />}
                  {audit && <span className="text-[11.5px] [color:var(--ink-faint)]">{audit.actor} · {formatDate(audit.occurred_at)}</span>}
                </div>
                <pre className="mono max-h-24 overflow-y-auto whitespace-pre-wrap rounded px-2 py-1.5 text-[11px] [background:var(--paper-sunken)] [color:var(--ink-secondary)]">{h.body}</pre>
                {audit?.note && <p className="text-[11.5px] [color:var(--ink-faint)] mt-1">{audit.note}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function TemplateEditor({ template, history, auditLogs }) {
  const [body, setBody] = useState(template.body ?? '')
  const [taskTitle, setTaskTitle] = useState(template.task_title ?? '')
  const [notes, setNotes] = useState(template.notes ?? '')
  const [approverName, setApproverName] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [result, setResult] = useState(null)
  const deferredBody = useDeferredValue(body)
  const isTask = TASK_CHANNELS.has(template.channel)
  const dirty = body !== (template.body ?? '') || taskTitle !== (template.task_title ?? '') || notes !== (template.notes ?? '')

  async function handleSave() {
    setSaving(true); setResult(null)
    const res = await saveTemplate({ templateKey: template.template_key, body, taskTitle, notes })
    setSaving(false)
    setResult(res)
  }

  async function handleApprove() {
    if (!approverName.trim()) { setResult({ error: 'Enter the approver name.' }); return }
    setApproving(true); setResult(null)
    const res = await approveTemplate({ templateId: template.id, templateKey: template.template_key, approverName })
    setApproving(false)
    setResult(res)
  }

  return (
    <div className="space-y-1.5">
      {/* Unapproved banner */}
      {!template.approved && (
        <div className="rounded-md border px-3.5 py-2.5 text-[12.5px] [border-color:var(--signal-warn-rule)] [background:var(--signal-warn-soft)] [color:var(--tone-warn-ink)]">
          <strong>Not approved.</strong> Unapproved templates are not sent by the automation. Save your edits first, then have someone mark it approved below.
        </div>
      )}

      {/* Meta */}
      <div className="surface px-3 py-2 flex flex-wrap items-center gap-4 text-sm">
        <span className="font-semibold [color:var(--ink)]">{templateLabel(template.template_key)}</span>
        <span className="mono text-[11.5px] [color:var(--ink-faint)]">{template.template_key}</span>
        <Badge label={template.channel} status={template.channel === 'sms' ? 'sent' : 'pending'} />
        <span className="tabular [color:var(--ink-faint)]">v{template.version}</span>
        {template.approved ? <Badge label="Approved" status="sent" /> : <Badge label="Not approved" status="failed" />}
      </div>

      {/* Result banner */}
      {result && (
        <div className={`rounded px-3 py-2 text-sm ${result.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {result.error ?? `Saved as v${result.version}. Template requires re-approval before it will send.`}
        </div>
      )}

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left: editing */}
        <div className="space-y-1.5">
          {isTask && (
            <div>
              <label className="eyebrow mb-1.5 block">Task title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="field h-9 w-full"
                placeholder="Task title shown in Jobber"
              />
            </div>
          )}
          <div>
            <label className="eyebrow mb-1.5 block">
              {isTask ? 'Task body' : 'SMS body'}
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="field mono w-full resize-y py-2 leading-relaxed"
              placeholder="Message body…"
            />
          </div>
          {!isTask && <SmsCounter body={deferredBody} />}
          <div>
            <label className="eyebrow mb-1.5 block">Notes (internal)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="field h-9 w-full"
              placeholder="Optional notes for the team"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="btn btn-primary"
            >
              {saving ? 'Saving…' : 'Save (bumps version)'}
            </button>
            {!dirty && <span className="text-[11.5px] [color:var(--ink-faint)]">No changes</span>}
          </div>
        </div>

        {/* Right: preview */}
        <Preview body={deferredBody} channel={template.channel} />
      </div>

      {/* Approve section — separate from save, intentionally */}
      {!template.approved && (
        <div className="surface px-4 py-4 space-y-1.5">
          <p className="text-[13px] font-medium [color:var(--ink)]">Mark as approved</p>
          <p className="text-[11.5px] [color:var(--ink-muted)]">Approval and editing are intentionally separate actions. Approving the current version (v{template.version}) allows the automation to send it. Enter the approver&apos;s name.</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              placeholder="Approver name"
              className="field h-9 w-48"
            />
            <button
              onClick={handleApprove}
              disabled={approving || !approverName.trim()}
              className="btn btn-primary"
            >
              {approving ? 'Approving…' : 'Mark approved'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <HistoryPanel history={history} auditLogs={auditLogs} />
    </div>
  )
}
