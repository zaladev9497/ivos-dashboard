'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import { updateCadenceStep } from './actions'

const UNIT_LABELS = { minutes: 'min', calendar_days: 'cal days', business_days: 'biz days', months: 'months' }
const UNITS = ['minutes', 'calendar_days', 'business_days', 'months']
const JOURNEY_LABELS = { retrofit: 'Retrofit', new_construction: 'New Construction', service: 'Service' }

function offsetLabel(val, unit) {
  return `+${val} ${UNIT_LABELS[unit] ?? unit}`
}

function groupByTrigger(steps) {
  const groups = {}
  for (const s of steps) {
    const k = s.trigger_event ?? 'unknown'
    if (!groups[k]) groups[k] = []
    groups[k].push(s)
  }
  return groups
}

// Warn if two SMS steps have same offset in same trigger group
function smsCollisions(steps) {
  const sms = steps.filter(s => s.channel === 'sms' && s.enabled)
  const seen = {}
  const collisions = new Set()
  for (const s of sms) {
    const key = `${s.trigger_event}:${s.offset_value}:${s.offset_unit}`
    if (seen[key]) collisions.add(key)
    seen[key] = true
  }
  return collisions
}

function StepRow({ step, quoteValidityDays, collision, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [offsetValue, setOffsetValue] = useState(Number(step.offset_value))
  const [offsetUnit, setOffsetUnit] = useState(step.offset_unit)
  const [enabled, setEnabled] = useState(step.enabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Warn if past quote validity
  const pastExpiry = offsetUnit === 'calendar_days' && offsetValue > quoteValidityDays && step.offset_from === 'base'

  async function handleSave() {
    setSaving(true); setError(null)
    const res = await updateCadenceStep({ id: step.id, offsetValue, offsetUnit, enabled })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setEditing(false)
    onSaved?.()
  }

  function handleCancel() {
    setOffsetValue(Number(step.offset_value))
    setOffsetUnit(step.offset_unit)
    setEnabled(step.enabled)
    setEditing(false)
    setError(null)
  }

  const channelColor = step.channel === 'sms' ? 'text-sky-600' : step.channel === 'task' ? 'text-amber-600' : 'text-slate-500'

  return (
    <div className={`px-4 py-3 ${!enabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Enable toggle */}
        <button
          onClick={() => { setEnabled(v => !v); setEditing(true) }}
          className={`w-8 h-4 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-slate-300'}`}
          title={enabled ? 'Disable step' : 'Enable step'}
        >
          <div className={`w-3 h-3 rounded-full bg-white shadow mx-0.5 transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>

        {/* Template key */}
        <span className="font-mono text-xs text-slate-700 flex-1 min-w-40">{step.template_key}</span>

        {/* Channel */}
        <span className={`text-xs font-medium ${channelColor}`}>{step.channel}</span>

        {/* Track */}
        {step.track && step.track !== 'NONE' && (
          <span className="text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{step.track}</span>
        )}

        {/* Offset */}
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={offsetValue}
              onChange={e => setOffsetValue(parseInt(e.target.value, 10) || 0)}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <select
              value={offsetUnit}
              onChange={e => setOffsetUnit(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none"
            >
              {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
            </select>
            <span className="text-xs text-slate-400">from {step.offset_from}</span>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-slate-600 hover:text-blue-600 font-mono bg-slate-100 rounded px-2 py-1">
            {offsetLabel(step.offset_value, step.offset_unit)}
            {step.offset_from !== 'base' && <span className="text-slate-400 ml-1">from {step.offset_from}</span>}
          </button>
        )}

        {/* Actions */}
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="text-xs rounded bg-slate-800 text-white px-2.5 py-1 hover:bg-slate-700 disabled:opacity-40">
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-800">Cancel</button>
          </div>
        )}

        {/* Warnings */}
        {collision && <span className="text-xs text-red-600">⚠ Two SMS same day</span>}
        {pastExpiry && <span className="text-xs text-amber-600">⚠ Past quote validity ({quoteValidityDays}d)</span>}
        {step.cap_before_expiry_days && <span className="text-xs text-slate-400">capped {step.cap_before_expiry_days}d before expiry</span>}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {step.notes && <p className="mt-0.5 text-xs text-slate-400 italic">{step.notes}</p>}
    </div>
  )
}

// Preview timeline
function TimelinePreview({ steps }) {
  const enabled = steps.filter(s => s.enabled && s.channel !== 'internal').sort((a, b) => {
    const order = { minutes: 0.001, calendar_days: 1, business_days: 1.4, months: 30 }
    return (Number(a.offset_value) * (order[a.offset_unit] ?? 1)) - (Number(b.offset_value) * (order[b.offset_unit] ?? 1))
  })

  if (!enabled.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Schedule preview (enabled steps only)</p>
      <div className="flex items-start gap-0 flex-wrap">
        {enabled.map((s, i) => (
          <div key={s.id} className="flex items-center">
            {i > 0 && <div className="h-px w-6 bg-slate-200 mt-4" />}
            <div className="text-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${s.channel === 'sms' ? 'border-sky-400 text-sky-600' : 'border-amber-300 text-amber-600'}`}>
                {s.channel === 'sms' ? '✉' : '✓'}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 w-16 text-center leading-tight">{offsetLabel(s.offset_value, s.offset_unit)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CadenceEditor({ steps, journeyType, journeys, journeyCounts, quoteValidityDays }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [localSteps, setLocalSteps] = useState(steps)

  const groups = groupByTrigger(localSteps)
  const collisions = smsCollisions(localSteps)
  const activeCount = journeyCounts[journeyType] ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Cadence Timing</h1>
      </div>

      {/* Journey tab selector */}
      <div className="flex gap-1 border-b border-slate-200">
        {journeys.map(j => (
          <button
            key={j}
            onClick={() => startTransition(() => router.push(`/cadence?journey=${j}`))}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              journeyType === j ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {JOURNEY_LABELS[j] ?? j}
          </button>
        ))}
      </div>

      {/* Active journeys notice */}
      {activeCount > 0 && (
        <div className="rounded bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">
          <strong>{activeCount} journey{activeCount !== 1 ? 's' : ''}</strong> currently running on the existing schedule. Changes only affect future journeys.
        </div>
      )}

      {/* Timeline preview */}
      <TimelinePreview steps={localSteps} />

      {/* Steps grouped by trigger */}
      {Object.entries(groups).map(([trigger, triggerSteps]) => (
        <div key={trigger} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Trigger: {trigger}</span>
            <span className="text-xs text-slate-400">{triggerSteps.filter(s => s.enabled).length}/{triggerSteps.length} enabled</span>
          </div>
          <div className="divide-y divide-slate-100">
            {triggerSteps.map(step => {
              const colKey = `${step.trigger_event}:${step.offset_value}:${step.offset_unit}`
              return (
                <StepRow
                  key={step.id}
                  step={step}
                  quoteValidityDays={quoteValidityDays}
                  collision={collisions.has(colKey)}
                  onSaved={() => router.refresh()}
                />
              )
            })}
          </div>
        </div>
      ))}

      {localSteps.length === 0 && <EmptyState title="No steps for this journey type" description="Check cadence_steps table." />}
    </div>
  )
}
