'use client'
import { useState, useDeferredValue } from 'react'
import Badge from '@/components/Badge'
import { formatDate } from '@/lib/utils'
import { smsInfo, typographicWarnings, validateMergeFields, applyPreview } from '@/lib/sms'
import { saveTemplate, approveTemplate } from './actions'

const TASK_CHANNELS = new Set(['task', 'internal'])

// ─── SMS Counter ──────────────────────────────────────────────────────────────
function SmsCounter({ body }) {
  const info = smsInfo(body)
  const warnings = typographicWarnings(body)
  const { invalid } = validateMergeFields(body)

  const segColor = info.segments >= 3 ? 'text-red-600' : info.segments === 2 ? 'text-amber-600' : 'text-green-700'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-slate-500">Encoding: <strong className="text-slate-700">{info.encoding}</strong></span>
        <span className="text-slate-500">Characters: <strong className="text-slate-700">{info.length}</strong></span>
        <span className={`font-semibold ${segColor}`}>{info.segments} segment{info.segments !== 1 ? 's' : ''}</span>
        <span className="text-slate-400">{info.remaining >= 0 ? `${info.remaining} remaining in last segment` : `${Math.abs(info.remaining)} over capacity`}</span>
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 h-full">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Preview</p>
      {isSms ? (
        <div className="flex justify-end">
          <div className="max-w-xs rounded-2xl rounded-br-sm bg-blue-500 text-white px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
            {preview || <span className="opacity-40 italic">Start typing…</span>}
          </div>
        </div>
      ) : (
        <div className="rounded bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
          {preview || <span className="text-slate-300 italic">Start typing…</span>}
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
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-50 transition-colors"
      >
        <span>Version history ({history.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="divide-y divide-slate-100">
          {history.map(h => {
            const audit = auditLogs.find(a => a.row_id === h.id)
            return (
              <div key={h.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-slate-500">v{h.version}</span>
                  {h.is_active && <Badge label="current" status="sent" />}
                  {h.approved ? <Badge label="approved" status="sent" /> : <Badge label="not approved" status="failed" />}
                  {audit && <span className="text-xs text-slate-400">{audit.actor} · {formatDate(audit.occurred_at)}</span>}
                </div>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded px-2 py-1.5 max-h-24 overflow-y-auto">{h.body}</pre>
                {audit?.note && <p className="text-xs text-slate-400 mt-1">{audit.note}</p>}
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
    <div className="space-y-4">
      {/* Unapproved banner */}
      {!template.approved && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Not approved.</strong> Unapproved templates are not sent by the automation. Save your edits first, then have someone mark it approved below.
        </div>
      )}

      {/* Meta */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="font-mono text-slate-700">{template.template_key}</span>
        <Badge label={template.channel} status={template.channel === 'sms' ? 'sent' : 'pending'} />
        <span className="text-slate-400">v{template.version}</span>
        {template.approved ? <Badge label="Approved" status="sent" /> : <Badge label="Not approved" status="failed" />}
      </div>

      {/* Result banner */}
      {result && (
        <div className={`rounded px-4 py-3 text-sm ${result.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {result.error ?? `Saved as v${result.version}. Template requires re-approval before it will send.`}
        </div>
      )}

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left: editing */}
        <div className="space-y-3">
          {isTask && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Task title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Task title shown in Jobber"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {isTask ? 'Task body' : 'SMS body'}
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-400 resize-y"
              placeholder="Message body…"
            />
          </div>
          {!isTask && <SmsCounter body={deferredBody} />}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes (internal)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Optional notes for the team"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save (bumps version)'}
            </button>
            {!dirty && <span className="text-xs text-slate-400">No changes</span>}
          </div>
        </div>

        {/* Right: preview */}
        <Preview body={deferredBody} channel={template.channel} />
      </div>

      {/* Approve section — separate from save, intentionally */}
      {!template.approved && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">Mark as approved</p>
          <p className="text-xs text-slate-500">Approval and editing are intentionally separate actions. Approving the current version (v{template.version}) allows the automation to send it. Enter the approver's name.</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              placeholder="Approver name"
              className="rounded border border-slate-200 px-3 py-2 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button
              onClick={handleApprove}
              disabled={approving || !approverName.trim()}
              className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-40"
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
