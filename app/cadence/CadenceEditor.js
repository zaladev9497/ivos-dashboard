'use client'
import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '@/components/EmptyState'
import FilterToggle from '@/components/FilterToggle'
import { updateCadenceStep } from './actions'
import { templateLabel, stageLabel } from '@/lib/utils'

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

/* Channel as a small icon + word in muted ink. The channel is a category, not
   a state, so it doesn't earn a coloured tile. */
function ChannelTag({ channel }) {
  const c = channelOf(channel)
  return (
    <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--ink-muted)' }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
        {c.icon}
      </svg>
      {c.label}
    </span>
  )
}

function Flag({ tone, children }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: `var(--tone-${tone}-ink)` }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <path d="M12 8.5v4M12 16v.01" />
        <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      </svg>
      {children}
    </span>
  )
}

function OffsetInput({ label, value, unit, onValue, onUnit, tone }) {
  const style = tone ? { borderColor: `var(--tone-${tone}-rule)` } : undefined
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium" style={{ color: tone ? `var(--tone-${tone}-ink)` : 'var(--ink-secondary)' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="field w-20"
          style={style}
          aria-label={`${label} value`}
        />
        <select value={unit} onChange={(e) => onUnit(e.target.value)} className="field w-40" style={style} aria-label={`${label} unit`}>
          {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
        </select>
      </div>
    </div>
  )
}

/* ── Step row ──────────────────────────────────────────────────────────────
   When · what · flags · on/off. The edit form opens beneath its own row. */
function StepRow({ step, quoteValidityDays, collision, onSaved, demoMode }) {
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

  const name = templateLabel(step.template_key)
  const from = step.offset_from === 'base' ? null : stageLabel(step.offset_from)

  return (
    <li
      className="border-t first:border-t-0"
      style={{
        borderColor: 'var(--rule-faint)',
        background: editing ? 'var(--paper-sunken)' : undefined,
      }}
    >
      <div className={`flex items-center gap-4 px-4 py-3 transition-opacity ${enabled ? '' : 'opacity-55'}`}>
        {/* When — the primary datum, in a fixed column so the sequence scans. */}
        <div className="w-28 shrink-0">
          <div className="tabular text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
            +{offsetLabel(step.offset_value, step.offset_unit)}
          </div>
          {(from || demoMode) && (
            <div className="truncate text-[11.5px]" style={{ color: demoMode ? 'var(--tone-alt-ink)' : 'var(--ink-faint)' }}>
              {demoMode
                ? `demo +${offsetLabel(step.demo_offset_value ?? step.offset_value, step.demo_offset_unit ?? step.offset_unit)}`
                : `after ${from}`}
            </div>
          )}
        </div>

        {/* What */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span className="truncate text-[13.5px] font-medium" style={{ color: 'var(--ink)' }} title={step.template_key}>
              {name}
            </span>
            <ChannelTag channel={step.channel} />
            {step.track && step.track !== 'NONE' && (
              <span className="mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{step.track}</span>
            )}
          </div>
          {(step.notes || collision || pastExpiry || step.cap_before_expiry_days) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {collision && <Flag tone="neg">Two texts at once</Flag>}
              {pastExpiry && <Flag tone="warn">After quote expires ({quoteValidityDays}d)</Flag>}
              {step.cap_before_expiry_days && (
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                  Capped {step.cap_before_expiry_days}d before expiry
                </span>
              )}
              {step.notes && (
                <span className="truncate text-[12px]" style={{ color: 'var(--ink-muted)' }} title={step.notes}>
                  {step.notes}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost h-7 px-2 text-[12.5px]">
              Edit
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? `Disable ${name}` : `Enable ${name}`}
            data-on={enabled}
            disabled={saving}
            onClick={toggleEnabled}
            className="switch"
          />
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 sm:pl-36">
          <div className="flex flex-wrap items-end gap-4">
            <OffsetInput
              label="Send after"
              value={offsetValue}
              unit={offsetUnit}
              onValue={setOffsetValue}
              onUnit={setOffsetUnit}
            />
            {demoMode && (
              <OffsetInput
                label="Demo timing"
                value={demoOffsetValue}
                unit={demoOffsetUnit}
                onValue={setDemoOffsetValue}
                onUnit={setDemoOffsetUnit}
                tone="alt"
              />
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSave} disabled={saving || !dirty} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={reset} disabled={saving} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="px-4 pb-3 text-[12px] font-medium sm:pl-36" style={{ color: 'var(--tone-neg-ink)' }} role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

/* ── Schedule rail ─────────────────────────────────────────────────────────
   Markers sit at their true elapsed position, so clustering and long gaps are
   visible. Markers that land close together collapse into one numbered
   cluster, so early steps never stack their labels on top of each other.
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
    <section className="surface overflow-hidden">
      <div className="section-head">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Schedule at a glance</span>
        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
          Enabled steps by elapsed time · hover a marker for details
        </span>
      </div>

      {/* Generous vertical room so labels never collide with the rail. */}
      <div className="relative mx-6 mb-11 mt-11">
        <div className="h-0.5 rounded-full" style={{ background: 'var(--rule)' }} />

        {/* Origin */}
        <div className="absolute top-0" style={{ left: 0 }}>
          <span
            className="block h-3 w-3 -translate-x-1/2 -translate-y-[5px] rounded-full"
            style={{ background: 'var(--ink)', boxShadow: '0 0 0 3px var(--paper-raised)' }}
            aria-hidden="true"
          />
          <span
            className="absolute top-4 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium"
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
          // cluster shares a unit, so mixed clusters label the earliest step.
          const sameUnit = cluster.items.every((s) => s.offset_unit === first.offset_unit)
          const label = !many
            ? `+${offsetLabel(first.offset_value, first.offset_unit)}`
            : sameUnit && first.offset_value !== lastItem.offset_value
              ? `+${first.offset_value}–${lastItem.offset_value} ${UNIT_SHORT[first.offset_unit] ?? first.offset_unit}`
              : `+${offsetLabel(first.offset_value, first.offset_unit)}`
          const above = ci % 2 === 0

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
                  background: 'var(--accent)',
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
                className="tabular absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium"
                style={{ [above ? 'bottom' : 'top']: '18px', color: 'var(--ink-muted)' }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
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
    <div className="page rise" style={{ gap: '1.25rem' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="page-title">Cadence</h1>
            <p className="page-lede">
              When each follow-up fires, measured from its trigger. Changes apply to journeys started from now on.
            </p>
          </div>
          <p className="pb-0.5 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="tabular font-semibold" style={{ color: 'var(--ink)' }}>{enabledTotal}</span>
            <span className="tabular"> of {steps.length}</span> steps enabled
          </p>
        </div>

        <div className="tabs" role="tablist" aria-label="Journey type">
          {journeys.map((j) => (
            <button
              key={j}
              role="tab"
              aria-selected={journeyType === j}
              onClick={() => startTransition(() => router.push(`/cadence?journey=${j}`))}
            >
              {JOURNEY_LABELS[j] ?? j}
              {journeyCounts[j] > 0 && (
                <span className="tabular text-[12px] font-normal" style={{ color: 'var(--ink-faint)' }}>
                  {journeyCounts[j]} live
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Live-journeys notice ────────────────────────────────────────── */}
      {activeCount > 0 && (
        <p className="flex items-start gap-2 text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--tone-info-ink)' }} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8v.01" />
          </svg>
          <span>
            <span className="font-medium" style={{ color: 'var(--ink-secondary)' }}>
              {activeCount} {JOURNEY_LABELS[journeyType] ?? journeyType} journey{activeCount !== 1 ? 's are' : ' is'}
            </span>{' '}
            already running and will keep their current schedule.
          </span>
        </p>
      )}

      <ScheduleRail steps={steps} />

      {/* ── Steps ───────────────────────────────────────────────────────── */}
      <section className="surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--rule-faint)' }}>
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--ink-faint)' }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search steps…"
              aria-label="Search steps"
              className="field w-full pl-8"
            />
          </div>
          <FilterToggle checked={onlyEnabled} onChange={(e) => setOnlyEnabled(e.target.checked)}>
            Enabled only
          </FilterToggle>
          {isPending && (
            <span
              className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-transparent"
              style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }}
              role="status"
              aria-label="Loading"
            />
          )}
        </div>

        {steps.length === 0 ? (
          <EmptyState
            title="No steps for this journey type"
            description="Nothing is configured in the cadence_steps table for this journey."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No steps match"
            description={filtering ? 'Try a different search, or turn off Enabled only.' : 'No steps to show.'}
            action={
              <button onClick={() => { setQuery(''); setOnlyEnabled(false) }} className="btn btn-quiet">
                Clear filters
              </button>
            }
          />
        ) : (
          Object.entries(groups).map(([trigger, triggerSteps]) => (
            <div key={trigger}>
              {/* Trigger band: what starts the clock for the rows below it. */}
              <div
                className="flex items-baseline gap-2 border-b px-4 py-2"
                style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
              >
                <span className="text-[12px]" style={{ color: 'var(--ink-faint)' }}>After</span>
                <span className="text-[12.5px] font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                  {triggerLabel(trigger).toLowerCase()}
                </span>
                <span className="tabular ml-auto text-[12px]" style={{ color: 'var(--ink-faint)' }}>
                  {triggerSteps.filter((s) => s.enabled).length} of {triggerSteps.length} on
                </span>
              </div>
              <ol>
                {triggerSteps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    quoteValidityDays={quoteValidityDays}
                    collision={collisions.has(`${step.trigger_event}:${step.offset_value}:${step.offset_unit}`)}
                    onSaved={() => router.refresh()}
                    demoMode={demoMode}
                  />
                ))}
              </ol>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
