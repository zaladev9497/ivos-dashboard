'use client'
import { useState, useDeferredValue } from 'react'
import Badge from '@/components/Badge'
import { formatDate } from '@/lib/utils'
import { smsInfo, typographicWarnings, validateMergeFields, applyPreview } from '@/lib/sms'
import { saveTemplate, approveTemplate } from './actions'

const TASK_CHANNELS = new Set(['task', 'internal'])

function Notice({ tone, children }) {
  return (
    <div
      className="flex items-start gap-2 rounded-[var(--radius)] border px-3 py-2 text-[12.5px] leading-relaxed"
      style={{ borderColor: `var(--tone-${tone}-rule)`, background: `var(--tone-${tone}-soft)`, color: `var(--tone-${tone}-ink)` }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true">
        {tone === 'pos'
          ? <path d="M20 6L9 17l-5-5" />
          : <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>}
      </svg>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

// ─── SMS meter: one quiet line under the textarea ──────────────────────────────
function SmsMeter({ body }) {
  const info = smsInfo(body)
  const segTone = info.segments >= 3 ? 'neg' : info.segments === 2 ? 'warn' : null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: 'var(--ink-muted)' }}>
      <span>
        <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{info.length}</span> characters
      </span>
      <span aria-hidden="true" style={{ color: 'var(--ink-faint)' }}>·</span>
      <span
        className={segTone ? 'font-semibold' : ''}
        style={{ color: segTone ? `var(--tone-${segTone}-ink)` : 'var(--ink-secondary)' }}
      >
        {info.segments} segment{info.segments !== 1 ? 's' : ''}
      </span>
      <span aria-hidden="true" style={{ color: 'var(--ink-faint)' }}>·</span>
      <span>{info.encoding}</span>
      <span className="ml-auto" style={{ color: 'var(--ink-faint)' }}>
        {info.remaining >= 0 ? `${info.remaining} left in segment` : `${Math.abs(info.remaining)} over`}
      </span>
    </div>
  )
}

function SmsWarnings({ body }) {
  const warnings = typographicWarnings(body)
  const { invalid } = validateMergeFields(body)
  if (!warnings.length && !invalid.length) return null
  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => <Notice key={i} tone="warn">{w}</Notice>)}
      {invalid.length > 0 && (
        <Notice tone="neg">
          Unknown merge fields, rejected at send time:{' '}
          <span className="mono">{invalid.map((f) => `{{${f}}}`).join(', ')}</span>
        </Notice>
      )}
    </div>
  )
}

// ─── Preview ───────────────────────────────────────────────────────────────────
function Preview({ body, channel }) {
  const preview = applyPreview(body)
  const isSms = channel === 'sms'
  return (
    <section className="surface overflow-hidden">
      <div className="section-head">
        <span className="eyebrow">Preview</span>
        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>with sample data</span>
      </div>
      <div className="px-4 py-5" style={{ background: 'var(--paper-sunken)' }}>
        {isSms ? (
          <div className="flex justify-end">
            <div
              className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-[4px] px-3.5 py-2.5 text-[13px] leading-relaxed"
              style={{ background: 'var(--accent)', color: 'var(--on-signal)' }}
            >
              {preview || <span className="italic opacity-60">Start typing…</span>}
            </div>
          </div>
        ) : (
          <div
            className="whitespace-pre-wrap rounded-[var(--radius)] border px-3.5 py-2.5 text-[13px] leading-relaxed"
            style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-raised)', color: 'var(--ink-secondary)' }}
          >
            {preview || <span className="italic" style={{ color: 'var(--ink-faint)' }}>Start typing…</span>}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Approval: sits beside the content it approves ──────────────────────────────
function ApprovalCard({ template, onResult }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function approve(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const res = await approveTemplate({ templateId: template.id, templateKey: template.template_key, approverName: name })
    setBusy(false)
    onResult(res.error ? res : { approved: true })
  }

  return (
    <section className="surface overflow-hidden" style={{ borderColor: 'var(--tone-warn-rule)' }}>
      <div className="px-4 py-3.5">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Approve v{template.version}</p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          Unapproved templates are never sent. Approval is kept separate from editing on purpose. Save any edits first.
        </p>
        <form onSubmit={approve} className="mt-3 flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Approver name"
            aria-label="Approver name"
            className="field min-w-0 flex-1"
          />
          <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary">
            {busy ? 'Approving…' : 'Approve'}
          </button>
        </form>
      </div>
    </section>
  )
}

// ─── History ───────────────────────────────────────────────────────────────────
function HistoryPanel({ history, auditLogs }) {
  const [open, setOpen] = useState(false)
  if (history.length <= 1) return null
  return (
    <section className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--paper-hover)]"
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
          Version history
          <span className="tabular ml-2 font-normal" style={{ color: 'var(--ink-faint)' }}>{history.length}</span>
        </span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ink-faint)' }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ol className="divide-y divide-[var(--rule-faint)] border-t" style={{ borderColor: 'var(--rule-faint)' }}>
          {history.map((h) => {
            const audit = auditLogs.find((a) => a.row_id === h.id)
            return (
              <li key={h.id} className="px-4 py-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="tabular text-[12.5px] font-semibold" style={{ color: 'var(--ink)' }}>v{h.version}</span>
                  {h.is_active && <Badge label="Current" status="active" dot={false} />}
                  {!h.approved && <Badge label="Not approved" status="medium" dot={false} />}
                  {audit && (
                    <span className="ml-auto text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                      {audit.actor} · {formatDate(audit.occurred_at)}
                    </span>
                  )}
                </div>
                <p
                  className="max-h-24 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-sm)] px-2.5 py-2 text-[12.5px] leading-relaxed"
                  style={{ background: 'var(--paper-sunken)', color: 'var(--ink-secondary)' }}
                >
                  {h.body}
                </p>
                {audit?.note && <p className="mt-1 text-[12px]" style={{ color: 'var(--ink-faint)' }}>{audit.note}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function Label({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink-secondary)' }}>{children}</span>
      {hint && <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>{hint}</span>}
    </label>
  )
}

// ─── Main editor ───────────────────────────────────────────────────────────────
export default function TemplateEditor({ template, history, auditLogs }) {
  const [body, setBody] = useState(template.body ?? '')
  const [taskTitle, setTaskTitle] = useState(template.task_title ?? '')
  const [notes, setNotes] = useState(template.notes ?? '')
  const [saving, setSaving] = useState(false)
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

  function discard() {
    setBody(template.body ?? ''); setTaskTitle(template.task_title ?? ''); setNotes(template.notes ?? '')
    setResult(null)
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <section className="surface overflow-hidden">
          <div className="space-y-4 px-5 py-4">
            {isTask && (
              <div>
                <Label htmlFor="tpl-title">Task title</Label>
                <input
                  id="tpl-title"
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="field w-full"
                  placeholder="Task title shown in Jobber"
                />
              </div>
            )}

            <div>
              <Label htmlFor="tpl-body" hint="Merge fields use {{double_braces}}">
                {isTask ? 'Task body' : 'Message'}
              </Label>
              <textarea
                id="tpl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                className="field h-auto w-full resize-y py-2.5 text-[13.5px] leading-relaxed"
                placeholder="Message body…"
              />
              {!isTask && <div className="mt-2"><SmsMeter body={deferredBody} /></div>}
            </div>

            {!isTask && <SmsWarnings body={deferredBody} />}

            <div>
              <Label htmlFor="tpl-notes" hint="Internal only, never sent">Notes</Label>
              <input
                id="tpl-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="field w-full"
                placeholder="Context for the team"
              />
            </div>
          </div>

          {/* Footer: what saving does, said next to the button that does it. */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3"
            style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
          >
            <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
              {dirty
                ? `Saving creates v${template.version + 1}, which will need approval.`
                : 'No unsaved changes.'}
            </p>
            <div className="flex items-center gap-2">
              {dirty && (
                <button type="button" onClick={discard} className="btn btn-ghost">Discard</button>
              )}
              <button type="button" onClick={handleSave} disabled={saving || !dirty} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save new version'}
              </button>
            </div>
          </div>
        </section>

        {result && (
          <div role="status">
            {result.error ? (
              <Notice tone="neg">{result.error}</Notice>
            ) : result.approved ? (
              <Notice tone="pos">Approved. The automation can now send this version.</Notice>
            ) : (
              <Notice tone="pos">Saved as v{result.version}. It needs approval before it will send.</Notice>
            )}
          </div>
        )}

        <HistoryPanel history={history} auditLogs={auditLogs} />
      </div>

      <div className="space-y-4">
        <Preview body={deferredBody} channel={template.channel} />
        {!template.approved && <ApprovalCard template={template} onResult={setResult} />}
      </div>
    </div>
  )
}
