'use client'
import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '@/components/EmptyState'
import { updateCadenceStep } from './actions'
import { templateLabel } from '@/lib/utils'

const UNIT_LABELS = { minutes: 'minutes', calendar_days: 'calendar days', business_days: 'business days', months: 'months' }
const UNIT_SHORT = { minutes: 'min', calendar_days: 'days', business_days: 'biz days', months: 'mo' }
const UNITS = ['minutes', 'calendar_days', 'business_days', 'months']
const JOURNEY_LABELS = { retrofit: 'Retrofit', new_construction: 'New Construction', service: 'Service' }

// Rough days-equivalent, used only to order steps and place them on the rail.
// Not a scheduling calculation — the backend owns real timing.
const UNIT_WEIGHT = { minutes: 1 / 1440, calendar_days: 1, business_days: 1.4, months: 30 }

// A rail label ("+15 biz days") is ~76px wide, which is 5-8% of the rail at
// common viewport widths. Labels alternate above/below the rail, so two
// adjacent ones only collide if they are closer than about half that.
// Anything tighter than this collapses into one numbered cluster marker.
const CLUSTER_PCT = 5

function weightOf(step) {
  return Number(step.offset_value) * (UNIT_WEIGHT[step.offset_unit] ?? 1)
}

function offsetLabel(val, unit) {
  return `${val} ${UNIT_SHORT[unit] ?? unit}`
}

function triggerLabel(key) {
  if (!key || key === 'unknown') return 'Other'
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function groupByTrigger(steps) {
  const groups = {}
  for (const s of steps) {
    const k = s.trigger_event ?? 'unknown'
    if (!groups[k]) groups[k] = []
    groups[k].push(s)
  }
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => weightOf(a) - weightOf(b))
  return groups
}

// Two enabled SMS steps on the same offset in the same trigger group means the
// customer receives two texts at once.
function smsCollisions(steps) {
  const seen = {}
  const collisions = new Set()
  for (const s of steps.filter((x) => x.channel === 'sms' && x.enabled)) {
    const key = `${s.trigger_event}:${s.offset_value}:${s.offset_unit}`
    if (seen[key]) collisions.add(key)
    seen[key] = true
  }
  return collisions
}

const CHANNEL = {
  sms: {
    tone: 'info',
    label: 'SMS',
    icon: <path d="M21 11.5a8.4 8.4 0 0 1-11.8 7L3 20.5l2-5.6A8.4 8.4 0 1 1 21 11.5z" />,
  },
  task: {
    tone: 'warn',
    label: 'Task',
    icon: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  },
  internal: {
    tone: 'neutral',
    label: 'Internal',
    icon: <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5l3 1.8" /></>,
  },
}

const channelOf = (ch) => CHANNEL[ch] ?? CHANNEL.internal

function ChannelMark({ channel, size = 36 }) {
  const c = channelOf(channel)
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[10px]"
      style={{
        width: size,
        height: size,
        background: `var(--tone-${c.tone}-soft)`,
        border: `1px solid var(--tone-${c.tone}-rule)`,
        color: `var(--tone-${c.tone}-ink)`,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ width: size * 0.5, height: size * 0.5 }}
      >
        {c.icon}
      </svg>
    </span>
  )
}

function Pill({ tone = 'warn', children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium"
      style={{
        background: `var(--tone-${tone}-soft)`,
        border: `1px solid var(--tone-${tone}-rule)`,
        color: `var(--tone-${tone}-ink)`,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <path d="M12 8.5v4M12 16v.01" />
        <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      </svg>
      {children}
    </span>
  )
}

/* ── Step card ───────────────────────────────────────────────────────────── */
function StepCard({ step, quoteValidityDays, collision, onSaved, demoMode }) {
  const [editing, setEditing] = useState(false)
  const [offsetValue, setOffsetValue] = useState(Number(step.offset_value))
  const [offsetUnit, setOffsetUnit] = useState(step.offset_unit)
  const [demoOffsetValue, setDemoOffsetValue] = useState(Number(step.demo_offset_value ?? step.offset_value))
  const [demoOffsetUnit, setDemoOffsetUnit] = useState(step.demo_offset_unit ?? step.offset_unit)
  const [enabled, setEnabled] = useState(step.enabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const pastExpiry =
    offsetUnit === 'calendar_days' && offsetValue > quoteValidityDays && step.offset_from === 'base'

  const dirty =
    offsetValue !== Number(step.offset_value) ||
    offsetUnit !== step.offset_unit ||
    demoOffsetValue !== Number(step.demo_offset_value ?? step.offset_value) ||
    demoOffsetUnit !== (step.demo_offset_unit ?? step.offset_unit)

  async function persist(patch) {
    setSaving(true)
    setError(null)
    const res = await updateCadenceStep({
      id: step.id,
      offsetValue: patch.offsetValue ?? Number(step.offset_value),
      offsetUnit: patch.offsetUnit ?? step.offset_unit,
      enabled: patch.enabled ?? enabled,
      demoOffsetValue: patch.demoOffsetValue ?? Number(step.demo_offset_value ?? step.offset_value),
      demoOffsetUnit: patch.demoOffsetUnit ?? step.demo_offset_unit ?? step.offset_unit,
    })
    setSaving(false)
    return res
  }

  async function handleSave() {
    const res = await persist({ offsetValue, offsetUnit, enabled, demoOffsetValue, demoOffsetUnit })
    if (res.error) { setError(res.error); return }
    setEditing(false)
    onSaved?.()
  }

  function reset() {
    setOffsetValue(Number(step.offset_value))
    setOffsetUnit(step.offset_unit)
    setDemoOffsetValue(Number(step.demo_offset_value ?? step.offset_value))
    setDemoOffsetUnit(step.demo_offset_unit ?? step.offset_unit)
    setEditing(false)
    setError(null)
  }

  // Enabling/disabling saves immediately — it is a direct action, not an edit.
  // Any unsaved offset edits are carried along, so toggling never silently
  // discards what the user typed into the open edit panel.
  async function toggleEnabled() {
    const next = !enabled
    setEnabled(next)
    const res = await persist({
      enabled: next,
      offsetValue,
      offsetUnit,
      demoOffsetValue,
      demoOffsetUnit,
    })
    if (res.error) { setError(res.error); setEnabled(!next); return }
    if (editing) setEditing(false)
    onSaved?.()
  }

  const c = channelOf(step.channel)
  const hasFlags = collision || pastExpiry || step.cap_before_expiry_days

  return (
    <article
      className="card"
      style={{
        padding: 0,
        opacity: enabled ? 1 : 0.62,
        borderColor: editing ? 'var(--accent)' : undefined,
        boxShadow: editing
          ? '0 0 0 3px color-mix(in oklab, var(--accent) 14%, transparent), var(--lift-card)'
          : undefined,
        transition: 'border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
      }}
    >
      {/* ── Head ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5 px-4 pt-4">
        <ChannelMark channel={step.channel} />

        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-[13.5px] font-semibold leading-snug"
            style={{ color: 'var(--ink)' }}
            title={templateLabel(step.template_key)}
          >
            {templateLabel(step.template_key)}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="eyebrow" style={{ color: `var(--tone-${c.tone}-ink)` }}>{c.label}</span>
            {step.track && step.track !== 'NONE' && (
              <>
                <span style={{ color: 'var(--ink-faint)' }}>·</span>
                <span className="mono text-[10.5px]" style={{ color: 'var(--ink-muted)' }}>
                  {step.track}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? `Disable ${templateLabel(step.template_key)}` : `Enable ${templateLabel(step.template_key)}`}
          data-on={enabled}
          disabled={saving}
          onClick={toggleEnabled}
          className="switch mt-1"
        />
      </div>

      {/* ── Timing: the primary datum ─────────────────────────────────── */}
      <div
        className="mx-4 mt-3.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-lg px-3 py-2.5"
        style={{ background: 'var(--paper-sunken)' }}
      >
        <span className="eyebrow">Sends</span>
        <span className="tabular text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
          +{offsetLabel(step.offset_value, step.offset_unit)}
        </span>
        <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
          after <span className="mono">{step.offset_from === 'base' ? triggerLabel(step.trigger_event).toLowerCase() : step.offset_from}</span>
        </span>
        {demoMode && (
          <span
            className="mono ml-auto rounded px-1.5 py-0.5 text-[10.5px]"
            style={{ background: 'var(--signal-alt-soft)', color: 'var(--tone-alt-ink)' }}
            title="Compressed timing used while demo mode is on"
          >
            demo +{offsetLabel(step.demo_offset_value ?? step.offset_value, step.demo_offset_unit ?? step.offset_unit)}
          </span>
        )}
      </div>

      {step.notes && (
        <p className="mt-3 px-4 text-[12px] italic leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
          {step.notes}
        </p>
      )}

      {hasFlags && (
        <div className="mt-3 flex flex-wrap gap-1.5 px-4">
          {collision && <Pill tone="neg">Two SMS on this offset</Pill>}
          {pastExpiry && <Pill tone="warn">Past quote validity ({quoteValidityDays}d)</Pill>}
          {step.cap_before_expiry_days && (
            <span className="inline-flex items-center text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
              Capped {step.cap_before_expiry_days}d before expiry
            </span>
          )}
        </div>
      )}

      {/* ── Footer / edit ─────────────────────────────────────────────── */}
      {!editing ? (
        <div className="mt-3.5 px-4 pb-3.5">
          <button
            onClick={() => setEditing(true)}
            className="btn btn-quiet h-8 w-full text-[12.5px]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Edit timing
          </button>
        </div>
      ) : (
        <div className="mt-3.5 border-t px-4 py-4" style={{ borderColor: 'var(--rule-faint)' }}>
          <div className="space-y-3.5">
            <div>
              <label className="eyebrow mb-1.5 block">Production offset</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={offsetValue}
                  onChange={(e) => setOffsetValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="field w-20"
                  aria-label="Production offset value"
                />
                <select
                  value={offsetUnit}
                  onChange={(e) => setOffsetUnit(e.target.value)}
                  className="field min-w-0 flex-1"
                  aria-label="Production offset unit"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                </select>
              </div>
            </div>

            {demoMode && (
              <div>
                <label className="eyebrow mb-1.5 block" style={{ color: 'var(--tone-alt-ink)' }}>
                  Demo offset
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={demoOffsetValue}
                    onChange={(e) => setDemoOffsetValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="field w-20"
                    style={{ borderColor: 'var(--signal-alt-rule)' }}
                    aria-label="Demo offset value"
                  />
                  <select
                    value={demoOffsetUnit}
                    onChange={(e) => setDemoOffsetUnit(e.target.value)}
                    className="field min-w-0 flex-1"
                    style={{ borderColor: 'var(--signal-alt-rule)' }}
                    aria-label="Demo offset unit"
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <p className="text-[12px] font-medium" style={{ color: 'var(--tone-neg-ink)' }} role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving || !dirty} className="btn btn-primary h-8 flex-1 text-[12.5px]">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={reset} disabled={saving} className="btn btn-quiet h-8 text-[12.5px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

/* ── Schedule rail ─────────────────────────────────────────────────────────
   Markers sit at their true elapsed position, so clustering and long gaps are
   visible. Labels are the hard part: at real positions, early steps overlap
   badly. Markers within 4% of each other are collapsed into one labelled
   cluster showing a range, which is what the previous version got wrong.
   ────────────────────────────────────────────────────────────────────────── */
function ScheduleRail({ steps }) {
  const clusters = useMemo(() => {
    const enabled = steps
      .filter((s) => s.enabled && s.channel !== 'internal')
      .sort((a, b) => weightOf(a) - weightOf(b))

    if (enabled.length < 2) return null

    const max = weightOf(enabled[enabled.length - 1]) || 1
    const out = []
    for (const s of enabled) {
      const pct = Math.min(100, (weightOf(s) / max) * 100)
      const last = out[out.length - 1]
      if (last && pct - last.pct < CLUSTER_PCT) {
        last.items.push(s)
        last.pct = (last.pct * (last.items.length - 1) + pct) / last.items.length
      } else {
        out.push({ pct, items: [s] })
      }
    }
    return out
  }, [steps])

  if (!clusters) return null

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="eyebrow">Schedule preview</h2>
        <p className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          Enabled steps, positioned by elapsed time
        </p>
      </div>

      {/* Generous vertical room so labels never collide with the rail. */}
      <div className="relative mt-10 mb-10 px-1">
        <div className="h-0.5 rounded-full" style={{ background: 'var(--rule)' }} />

        {/* Origin */}
        <div className="absolute top-0" style={{ left: 0 }}>
          <span
            className="block h-3 w-3 -translate-x-1/2 -translate-y-[5px] rounded-full"
            style={{ background: 'var(--ink)', boxShadow: '0 0 0 3px var(--paper-raised)' }}
            aria-hidden="true"
          />
          <span
            className="eyebrow absolute top-4 -translate-x-1/2 whitespace-nowrap"
            style={{ color: 'var(--ink-muted)' }}
          >
            Start
          </span>
        </div>

        {clusters.map((cluster, ci) => {
          const first = cluster.items[0]
          const lastItem = cluster.items[cluster.items.length - 1]
          const many = cluster.items.length > 1

          // A range ("+2–3 biz days") only makes sense when every step in the
          // cluster shares a unit. Mixing units produced nonsense like
          // "+0–1 biz days" for a 1-minute step grouped with a 1-day step, so
          // mixed clusters fall back to labelling the earliest step.
          const sameUnit = cluster.items.every((s) => s.offset_unit === first.offset_unit)
          const label = !many
            ? `+${offsetLabel(first.offset_value, first.offset_unit)}`
            : sameUnit && first.offset_value !== lastItem.offset_value
              ? `+${first.offset_value}–${lastItem.offset_value} ${UNIT_SHORT[first.offset_unit] ?? first.offset_unit}`
              : `+${offsetLabel(first.offset_value, first.offset_unit)}`
          const above = ci % 2 === 0
          const tone = channelOf(first.channel).tone
          const dotColor = tone === 'neutral' ? 'var(--ink-muted)' : `var(--signal-${tone})`

          return (
            <div
              key={ci}
              className="group absolute top-0"
              style={{ left: `${Math.min(99, Math.max(1, cluster.pct))}%` }}
            >
              <span
                className="relative block -translate-x-1/2 -translate-y-[5px] rounded-full transition-transform duration-150 group-hover:scale-125"
                style={{
                  width: many ? 14 : 12,
                  height: many ? 14 : 12,
                  background: many ? 'var(--accent)' : dotColor,
                  boxShadow: '0 0 0 3px var(--paper-raised)',
                }}
                title={cluster.items.map((s) => `${templateLabel(s.template_key)} — +${offsetLabel(s.offset_value, s.offset_unit)}`).join('\n')}
              >
                {many && (
                  <span
                    className="tabular absolute inset-0 flex items-center justify-center text-[8px] font-bold"
                    style={{ color: 'var(--on-signal)' }}
                  >
                    {cluster.items.length}
                  </span>
                )}
              </span>
              <span
                className="tabular absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10.5px] font-medium"
                style={{
                  [above ? 'bottom' : 'top']: '18px',
                  color: 'var(--ink-muted)',
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
        Numbered markers group steps that land close together. Hover any marker for details.
      </p>
    </section>
  )
}

export default function CadenceEditor({ steps, journeyType, journeys, journeyCounts, quoteValidityDays, demoMode }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [onlyEnabled, setOnlyEnabled] = useState(false)

  const collisions = smsCollisions(steps)
  const activeCount = journeyCounts[journeyType] ?? 0

  const visible = steps.filter((s) => {
    if (onlyEnabled && !s.enabled) return false
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return (
      templateLabel(s.template_key).toLowerCase().includes(q) ||
      s.template_key.toLowerCase().includes(q) ||
      (s.trigger_event ?? '').toLowerCase().includes(q) ||
      (s.channel ?? '').toLowerCase().includes(q)
    )
  })

  const groups = groupByTrigger(visible)
  const enabledTotal = steps.filter((s) => s.enabled).length
  const filtering = onlyEnabled || query.trim().length > 0

  return (
    <div className="page rise">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="page-head">
        <div>
          <h1 className="page-title">Cadence</h1>
          <p className="page-lede">
            When each follow-up fires, measured from its trigger. Changes apply to journeys
            started from now on.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div>
            <div className="stat-figure" style={{ fontSize: '1.5rem' }}>
              {enabledTotal}
              <span className="text-[15px] font-normal" style={{ color: 'var(--ink-faint)' }}>
                /{steps.length}
              </span>
            </div>
            <div className="eyebrow mt-1">Steps enabled</div>
          </div>
          {activeCount > 0 && (
            <>
              <div className="h-9 w-px" style={{ background: 'var(--rule)' }} aria-hidden="true" />
              <div>
                <div className="stat-figure" style={{ fontSize: '1.5rem' }}>{activeCount}</div>
                <div className="eyebrow mt-1">Live journeys</div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Journey switcher ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="segmented" role="tablist" aria-label="Journey type">
          {journeys.map((j) => (
            <button
              key={j}
              role="tab"
              aria-selected={journeyType === j}
              onClick={() => startTransition(() => router.push(`/cadence?journey=${j}`))}
            >
              {JOURNEY_LABELS[j] ?? j}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: 'var(--ink-faint)' }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter steps…"
            aria-label="Filter steps"
            className="field w-60 pl-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="btn btn-ghost absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0!"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          aria-pressed={onlyEnabled}
          onClick={() => setOnlyEnabled((v) => !v)}
          className="btn"
          style={{
            background: onlyEnabled ? 'var(--accent-soft)' : 'var(--paper-raised)',
            border: `1px solid ${onlyEnabled ? 'var(--accent-rule)' : 'var(--rule)'}`,
            color: onlyEnabled ? 'var(--accent-ink)' : 'var(--ink-muted)',
            boxShadow: 'var(--lift-flat)',
          }}
        >
          Enabled only
        </button>

        {isPending && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-transparent"
            style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }}
            aria-label="Loading"
          />
        )}
      </div>

      {/* ── Live-journeys notice ────────────────────────────────────────── */}
      {activeCount > 0 && (
        <div
          className="flex items-start gap-2.5 rounded-[9px] border px-4 py-3 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-info-rule)',
            background: 'var(--signal-info-soft)',
            color: 'var(--tone-info-ink)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="mt-px h-4 w-4 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8v.01" />
          </svg>
          <span>
            <strong className="font-semibold">
              {activeCount} {JOURNEY_LABELS[journeyType] ?? journeyType} journey{activeCount !== 1 ? 's' : ''}
            </strong>{' '}
            running on the existing schedule. Edits here only affect journeys started from now on.
          </span>
        </div>
      )}

      <ScheduleRail steps={steps} />

      {/* ── Steps, grouped by trigger ───────────────────────────────────── */}
      {Object.entries(groups).map(([trigger, triggerSteps]) => (
        <section key={trigger} className="space-y-3.5">
          <div className="flex items-center gap-3">
            <h2 className="eyebrow" style={{ color: 'var(--ink-secondary)' }}>
              {triggerLabel(trigger)}
            </h2>
            <span className="counter">
              {triggerSteps.filter((s) => s.enabled).length}/{triggerSteps.length}
            </span>
            <div className="rule-fade flex-1" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {triggerSteps.map((step) => (
              <StepCard
                key={step.id}
                step={step}
                quoteValidityDays={quoteValidityDays}
                collision={collisions.has(`${step.trigger_event}:${step.offset_value}:${step.offset_unit}`)}
                onSaved={() => router.refresh()}
                demoMode={demoMode}
              />
            ))}
          </div>
        </section>
      ))}

      {steps.length === 0 && (
        <div className="surface">
          <EmptyState
            title="No steps for this journey type"
            description="Nothing is configured in the cadence_steps table for this journey."
          />
        </div>
      )}

      {steps.length > 0 && visible.length === 0 && (
        <div className="surface">
          <EmptyState
            title="No steps match"
            description={
              filtering
                ? 'Try a different search term, or turn off the enabled-only filter.'
                : 'No steps to show.'
            }
            action={
              <button
                onClick={() => { setQuery(''); setOnlyEnabled(false) }}
                className="btn btn-quiet"
              >
                Clear filters
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}
