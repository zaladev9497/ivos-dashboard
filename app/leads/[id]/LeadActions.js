'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/ConfirmDialog'
import { pauseJourney, resumeJourney, cancelScheduledMessage, handBackToBot, sendMessageNow } from './actions'
import { formatDate, templateLabel, journeyTypeLabel } from '@/lib/utils'

function ActionResult({ result }) {
  if (!result) return null
  return (
    <p
      className="mt-1.5 text-[11.5px] font-medium"
      style={{ color: result.error ? 'var(--tone-neg-ink)' : 'var(--tone-pos-ink)' }}
      role="status"
    >
      {result.error ?? 'Done.'}
    </p>
  )
}

// Inline disclosure form — a sunken well, so an open form reads as a drawer
// pulled out of the panel rather than another card stacked on top of it.
function Well({ children }) {
  return (
    <div
      className="mt-2 space-y-2.5 rounded-md border p-3"
      style={{ background: 'var(--paper-sunken)', borderColor: 'var(--rule-faint)' }}
    >
      {children}
    </div>
  )
}

function FieldLabel({ children, required }) {
  return (
    <label className="eyebrow mb-1.5 block">
      {children}
      {required && <span style={{ color: 'var(--signal-neg)' }}> *</span>}
    </label>
  )
}

// ─── Pause / Resume ────────────────────────────────────────────────────────────
function JourneyActions({ journey }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pausedUntil, setPausedUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const isPaused = journey.state === 'paused'
  const isActionable = journey.state === 'active' || journey.state === 'paused'
  if (!isActionable) return null

  async function handlePause() {
    setSaving(true); setResult(null)
    const res = await pauseJourney({ journeyId: journey.id, reason, pausedUntil: pausedUntil || undefined })
    setSaving(false); setResult(res)
    if (res.ok) { setOpen(false); setReason(''); setPausedUntil(''); router.refresh() }
  }

  async function handleResume() {
    setSaving(true); setResult(null)
    const res = await resumeJourney({ journeyId: journey.id })
    setSaving(false); setResult(res)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
          {journeyTypeLabel(journey.journey_type)} journey
          <span className="ml-1.5 text-[12px]" style={{ color: isPaused ? 'var(--tone-warn-ink)' : 'var(--ink-muted)' }}>
            {isPaused ? 'Paused' : 'Running'}
          </span>
        </span>
        {isPaused ? (
          <button onClick={handleResume} disabled={saving} className="btn btn-primary h-7 px-2.5 text-[11.5px]">
            {saving ? '…' : 'Resume journey'}
          </button>
        ) : (
          <button onClick={() => setOpen(true)} className="btn btn-quiet h-7 px-2.5 text-[11.5px]">
            Pause journey
          </button>
        )}
      </div>
      {journey.paused_reason && (
        <p className="text-[11.5px]" style={{ color: 'var(--tone-warn-ink)' }}>
          Paused: {journey.paused_reason}
        </p>
      )}
      <ActionResult result={result} />

      {open && (
        <Well>
          <div>
            <FieldLabel required>Pause reason</FieldLabel>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer requested no contact until next week"
              className="field h-7 w-full text-[12px]"
            />
          </div>
          <div>
            <FieldLabel>Pause until (optional)</FieldLabel>
            <input
              type="date"
              value={pausedUntil}
              onChange={e => setPausedUntil(e.target.value)}
              className="field h-7 text-[12px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePause}
              disabled={saving || !reason.trim()}
              className="btn btn-primary h-7 px-2.5 text-[11.5px]"
            >
              {saving ? '…' : 'Confirm pause'}
            </button>
            <button
              onClick={() => { setOpen(false); setResult(null) }}
              className="btn btn-ghost h-7 px-2 text-[11.5px]"
            >
              Cancel
            </button>
          </div>
        </Well>
      )}
    </div>
  )
}

// ─── Cancel scheduled message ──────────────────────────────────────────────────
function CancelMessageRow({ msg, demoMode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  async function handleSendNow() {
    setSending(true); setResult(null)
    const res = await sendMessageNow({ messageId: msg.id })
    setResult(res)
    if (res.ok) { await new Promise(r => setTimeout(r, 2500)); router.refresh() }
    setSending(false)
  }

  async function handleCancel() {
    setSaving(true); setResult(null)
    const res = await cancelScheduledMessage({ messageId: msg.id, reason })
    setSaving(false); setResult(res)
    if (res.ok) { setOpen(false); setReason(''); router.refresh() }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[12px] font-medium" style={{ color: 'var(--ink)' }} title={msg.template_key}>
          {templateLabel(msg.template_key)}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{msg.channel}</span>
        <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>→ {formatDate(msg.scheduled_for)}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {demoMode && (
            <button
              onClick={handleSendNow}
              disabled={sending}
              className="btn h-6 px-2 text-[11px]"
              style={{
                background: 'var(--signal-alt-soft)',
                border: '1px solid var(--signal-alt-rule)',
                color: 'var(--tone-alt-ink)',
              }}
            >
              {sending ? 'Sending…' : 'Send now'}
            </button>
          )}
          <button
            onClick={() => setOpen(v => !v)}
            className="btn h-6 px-2 text-[11px]"
            style={{
              background: 'transparent',
              border: '1px solid var(--signal-neg-rule)',
              color: 'var(--tone-neg-ink)',
            }}
          >
            Cancel
          </button>
        </span>
      </div>
      {open && (
        <Well>
          <div>
            <FieldLabel required>Reason</FieldLabel>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer requested no more messages"
              className="field h-7 w-full text-[12px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving || !reason.trim()}
              className="btn btn-danger h-7 px-2.5 text-[11.5px]"
            >
              {saving ? '…' : 'Confirm cancel'}
            </button>
            <button
              onClick={() => { setOpen(false); setResult(null) }}
              className="btn btn-ghost h-7 px-2 text-[11.5px]"
            >
              Dismiss
            </button>
          </div>
        </Well>
      )}
      <ActionResult result={result} />
    </div>
  )
}

// ─── Hand back to bot ──────────────────────────────────────────────────────────
function HandBackRow({ conv, leadId }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  async function handleHandBack() {
    setSaving(true); setResult(null)
    const res = await handBackToBot({ conversationId: conv.id, leadId })
    setSaving(false); setResult(res); setConfirm(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge" style={{
          background: 'var(--tone-warn-soft)',
          borderColor: 'var(--tone-warn-rule)',
          color: 'var(--tone-warn-ink)',
        }}>
          <span className="badge-dot" />
          Human takeover active
        </span>
        <button onClick={() => setConfirm(true)} className="btn btn-primary h-7 px-2.5 text-[11.5px]">
          Hand back to bot
        </button>
      </div>
      <ActionResult result={result} />
      <ConfirmDialog
        open={confirm}
        title="Hand back to bot"
        message="This will return the conversation to the automation. The bot will resume sending follow-ups according to the cadence schedule."
        confirmLabel={saving ? '…' : 'Hand back'}
        onConfirm={handleHandBack}
        onCancel={() => setConfirm(false)}
      />
    </div>
  )
}

// ─── Main panel ────────────────────────────────────────────────────────────────
export default function LeadActions({ journeys, scheduledMessages, conversations, leadId, demoMode }) {
  const pendingMessages = (scheduledMessages ?? []).filter(m => m.state === 'pending')
  const takeoverConvs = (conversations ?? []).filter(c => c.human_state === 'human_takeover')
  const actionableJourneys = (journeys ?? []).filter(j => j.state === 'active' || j.state === 'paused')

  if (!actionableJourneys.length && !pendingMessages.length && !takeoverConvs.length) return null

  return (
    <section className="surface overflow-hidden">
      <div className="section-head">
        <span className="eyebrow">Actions</span>
      </div>
      <div className="divide-y divide-[var(--rule-faint)] px-5">
        {actionableJourneys.length > 0 && (
          <div className="space-y-2 py-3.5">
            {actionableJourneys.map(j => <JourneyActions key={j.id} journey={j} />)}
          </div>
        )}
        {pendingMessages.length > 0 && (
          <div className="space-y-2.5 py-3.5">
            <p className="eyebrow">Queued messages</p>
            {pendingMessages.map(m => <CancelMessageRow key={m.id} msg={m} demoMode={demoMode} />)}
          </div>
        )}
        {takeoverConvs.length > 0 && (
          <div className="space-y-2 py-3.5">
            {takeoverConvs.map(c => <HandBackRow key={c.id} conv={c} leadId={leadId} />)}
          </div>
        )}
      </div>
    </section>
  )
}
