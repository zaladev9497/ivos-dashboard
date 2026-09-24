'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/ConfirmDialog'
import { pauseJourney, resumeJourney, cancelScheduledMessage, handBackToBot } from './actions'
import { formatDate } from '@/lib/utils'

function ActionResult({ result }) {
  if (!result) return null
  return (
    <p className={`mt-1 text-xs ${result.error ? 'text-red-600' : 'text-green-700'}`}>
      {result.error ?? 'Done.'}
    </p>
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
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-mono">{journey.journey_type}</span>
        {isPaused ? (
          <button
            onClick={handleResume}
            disabled={saving}
            className="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-40"
          >
            {saving ? '…' : 'Resume journey'}
          </button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
          >
            Pause journey
          </button>
        )}
        {journey.paused_reason && (
          <span className="text-xs text-amber-600">Paused: {journey.paused_reason}</span>
        )}
      </div>
      <ActionResult result={result} />

      {open && (
        <div className="mt-2 space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pause reason <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer requested no contact until next week"
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pause until (optional)</label>
            <input
              type="date"
              value={pausedUntil}
              onChange={e => setPausedUntil(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePause}
              disabled={saving || !reason.trim()}
              className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {saving ? '…' : 'Confirm pause'}
            </button>
            <button onClick={() => { setOpen(false); setResult(null) }} className="text-xs text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Cancel scheduled message ──────────────────────────────────────────────────
function CancelMessageRow({ msg }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  async function handleCancel() {
    setSaving(true); setResult(null)
    const res = await cancelScheduledMessage({ messageId: msg.id, reason })
    setSaving(false); setResult(res)
    if (res.ok) { setOpen(false); setReason(''); router.refresh() }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-xs text-slate-600">{msg.template_key}</span>
        <span className="text-xs text-slate-400">{msg.channel}</span>
        <span className="text-xs text-slate-400">→ {formatDate(msg.scheduled_for)}</span>
        <button
          onClick={() => setOpen(v => !v)}
          className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
        >
          Cancel
        </button>
      </div>
      {open && (
        <div className="mt-1 space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Customer requested no more messages"
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={saving || !reason.trim()}
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-40"
            >
              {saving ? '…' : 'Confirm cancel'}
            </button>
            <button onClick={() => { setOpen(false); setResult(null) }} className="text-xs text-slate-500 hover:text-slate-800">
              Dismiss
            </button>
          </div>
        </div>
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-700 font-medium">Human takeover active</span>
        <button
          onClick={() => setConfirm(true)}
          className="rounded bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
        >
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
export default function LeadActions({ journeys, scheduledMessages, conversations, leadId }) {
  const pendingMessages = (scheduledMessages ?? []).filter(m => m.state === 'pending')
  const takeoverConvs = (conversations ?? []).filter(c => c.human_state === 'human_takeover')
  const actionableJourneys = (journeys ?? []).filter(j => j.state === 'active' || j.state === 'paused')

  if (!actionableJourneys.length && !pendingMessages.length && !takeoverConvs.length) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Actions
      </div>
      <div className="px-4 py-3 space-y-4 divide-y divide-slate-100">
        {actionableJourneys.length > 0 && (
          <div className="space-y-3 pt-0">
            <p className="text-xs font-medium text-slate-500">Journey</p>
            {actionableJourneys.map(j => <JourneyActions key={j.id} journey={j} />)}
          </div>
        )}
        {pendingMessages.length > 0 && (
          <div className="space-y-2 pt-3">
            <p className="text-xs font-medium text-slate-500">Pending messages</p>
            {pendingMessages.map(m => <CancelMessageRow key={m.id} msg={m} />)}
          </div>
        )}
        {takeoverConvs.length > 0 && (
          <div className="space-y-2 pt-3">
            {takeoverConvs.map(c => <HandBackRow key={c.id} conv={c} leadId={leadId} />)}
          </div>
        )}
      </div>
    </div>
  )
}
