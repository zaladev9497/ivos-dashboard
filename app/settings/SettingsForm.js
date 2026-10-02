'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { updateBusinessCalendar } from './actions'

// working_days is an integer[] of ISO weekdays in Postgres: 1 = Monday ... 7 = Sunday.
const DAYS = [
  { n: 1, label: 'Mon', full: 'Monday' },
  { n: 2, label: 'Tue', full: 'Tuesday' },
  { n: 3, label: 'Wed', full: 'Wednesday' },
  { n: 4, label: 'Thu', full: 'Thursday' },
  { n: 5, label: 'Fri', full: 'Friday' },
  { n: 6, label: 'Sat', full: 'Saturday' },
  { n: 7, label: 'Sun', full: 'Sunday' },
]

// Mirrors the server's FIELD_RULES in app/settings/actions.js. Kept in sync so
// the form can block an invalid save locally instead of round-tripping to a
// rejection — the old UI allowed 1–3600s here while the server only accepts
// 5–300, so bad values failed silently after a request.
const LIMITS = {
  quoteValidityDays: { min: 1, max: 365 },
  demoPollInterval: { min: 5, max: 300 },
}

// Postgres `time` columns come back as "08:00:00"; <input type="time"> wants "HH:MM".
const toTimeInput = (t) => (typeof t === 'string' ? t.slice(0, 5) : '')

const COMMON_TZ = [
  'America/Chicago', 'America/New_York', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto',
  'Europe/London', 'UTC',
]

function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz.trim() })
    return true
  } catch {
    return false
  }
}

/* ── Layout primitives ───────────────────────────────────────────────────── */

function Section({ title, description, note, children, footer }) {
  return (
    <section className="surface flex flex-col overflow-hidden">
      <header className="border-b px-5 py-4" style={{ borderColor: 'var(--rule-faint)' }}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</h2>
          {note}
        </div>
        {description && (
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            {description}
          </p>
        )}
      </header>

      <div className="flex-1 divide-y divide-[var(--rule-faint)]">
        {children}
      </div>

      {footer && (
        <div
          className="flex flex-wrap items-center gap-3 border-t px-5 py-3"
          style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
        >
          {footer}
        </div>
      )}
    </section>
  )
}

function Field({ label, hint, htmlFor, error, children }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[minmax(170px,34%)_1fr]">
      <div>
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium"
          style={{ color: 'var(--ink)' }}
        >
          {label}
        </label>
        {hint && (
          <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
            {hint}
          </p>
        )}
      </div>
      <div className="min-w-0 max-w-xl">
        {children}
        {error && (
          <p className="mt-1.5 text-[11.5px] font-medium" style={{ color: 'var(--tone-neg-ink)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

// Per-section status, so you can tell which block saved rather than reading a
// single page-level banner.
function SaveState({ state }) {
  if (!state) return null
  const ok = state.ok
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 text-[12px] font-medium"
      style={{ color: ok ? 'var(--tone-pos-ink)' : 'var(--tone-neg-ink)' }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        {ok ? <path d="M20 6L9 17l-5-5" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16v.01" /></>}
      </svg>
      {ok ? 'Saved' : state.error}
    </span>
  )
}

function Switch({ checked, onChange, disabled, tone = 'pos', label, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="switch"
      data-on={checked}
      style={checked ? { background: `var(--signal-${tone})` } : undefined}
    />
  )
}

/* ── Form ────────────────────────────────────────────────────────────────── */

export default function SettingsForm({ calendar }) {
  // Saved baseline — every dirty check compares against this.
  const saved = {
    timezone: calendar?.timezone ?? '',
    openTime: toTimeInput(calendar?.open_time),
    closeTime: toTimeInput(calendar?.close_time),
    workingDays: (calendar?.working_days ?? []).map(Number),
    quoteValidityDays: calendar?.quote_validity_days ?? 30,
    smsRedirectTo: calendar?.sms_redirect_to ?? '',
    testOnly: calendar?.test_only ?? false,
    demoMode: calendar?.demo_mode ?? false,
    demoPollInterval: calendar?.demo_poll_interval_seconds ?? 10,
  }

  const [timezone, setTimezone] = useState(saved.timezone)
  const [openTime, setOpenTime] = useState(saved.openTime)
  const [closeTime, setCloseTime] = useState(saved.closeTime)
  const [workingDays, setWorkingDays] = useState(saved.workingDays)
  const [quoteValidityDays, setQuoteValidityDays] = useState(saved.quoteValidityDays)
  const [smsRedirectTo, setSmsRedirectTo] = useState(saved.smsRedirectTo)
  const [testOnly, setTestOnly] = useState(saved.testOnly)
  const [demoMode, setDemoMode] = useState(saved.demoMode)
  const [demoPollInterval, setDemoPollInterval] = useState(saved.demoPollInterval)

  // Which section is mid-save, and each section's last result.
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState({})
  const [confirm, setConfirm] = useState(null)

  // Re-sync only when the server's values actually differ.
  //
  // revalidatePath() gives this component a NEW `calendar` object after every
  // save, so depending on [calendar] re-ran this on each one and overwrote the
  // state we had just set — the Demo toggle flipped on, then immediately snapped
  // back off. Keying on a signature of the values fixes that, and also stops a
  // save in one section from wiping unsaved edits in another.
  const signature = JSON.stringify([
    saved.timezone, saved.openTime, saved.closeTime, saved.workingDays,
    saved.quoteValidityDays, saved.smsRedirectTo, saved.testOnly,
    saved.demoMode, saved.demoPollInterval,
  ])
  const lastSignature = useRef(signature)

  useEffect(() => {
    if (lastSignature.current === signature) return
    lastSignature.current = signature
    setTimezone(saved.timezone)
    setOpenTime(saved.openTime)
    setCloseTime(saved.closeTime)
    setWorkingDays(saved.workingDays)
    setQuoteValidityDays(saved.quoteValidityDays)
    setSmsRedirectTo(saved.smsRedirectTo)
    setTestOnly(saved.testOnly)
    setDemoMode(saved.demoMode)
    setDemoPollInterval(saved.demoPollInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // "Saved" confirmations clear themselves; errors stay until resolved.
  const timers = useRef({})
  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach(clearTimeout)
  }, [])

  const doSave = useCallback(async (section, fields) => {
    setBusy(section)
    setStatus((s) => ({ ...s, [section]: null }))
    const res = await updateBusinessCalendar(fields)
    setBusy(null)
    setStatus((s) => ({ ...s, [section]: res }))
    if (res.ok) {
      clearTimeout(timers.current[section])
      timers.current[section] = setTimeout(
        () => setStatus((s) => ({ ...s, [section]: null })),
        3200
      )
    }
    return res
  }, [])

  function toggleDay(n) {
    setWorkingDays((prev) =>
      prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort((a, b) => a - b)
    )
  }

  /* ── Validation (mirrors the server) ───────────────────────────────── */
  const tzError = timezone.trim() && !isValidTimezone(timezone) ? 'Not a valid IANA timezone name.' : null
  const hoursError =
    openTime && closeTime && openTime >= closeTime
      ? 'Opening time must be earlier than closing time.'
      : null
  const daysError = workingDays.length === 0 ? 'Choose at least one working day.' : null
  const quoteError =
    !Number.isInteger(Number(quoteValidityDays)) ||
    quoteValidityDays < LIMITS.quoteValidityDays.min ||
    quoteValidityDays > LIMITS.quoteValidityDays.max
      ? `Must be a whole number from ${LIMITS.quoteValidityDays.min} to ${LIMITS.quoteValidityDays.max}.`
      : null
  const pollError =
    !Number.isInteger(Number(demoPollInterval)) ||
    demoPollInterval < LIMITS.demoPollInterval.min ||
    demoPollInterval > LIMITS.demoPollInterval.max
      ? `Must be ${LIMITS.demoPollInterval.min}–${LIMITS.demoPollInterval.max} seconds.`
      : null

  /* ── Dirty tracking — Save stays disabled until something changes ──── */
  const sameDays =
    workingDays.length === saved.workingDays.length &&
    workingDays.every((d) => saved.workingDays.includes(d))
  const scheduleDirty =
    timezone !== saved.timezone ||
    openTime !== saved.openTime ||
    closeTime !== saved.closeTime ||
    !sameDays
  const quoteDirty = Number(quoteValidityDays) !== Number(saved.quoteValidityDays)
  const redirectDirty = smsRedirectTo.trim() !== saved.smsRedirectTo
  const pollDirty = Number(demoPollInterval) !== Number(saved.demoPollInterval)

  const scheduleValid = !tzError && !hoursError && !daysError && !!timezone.trim() && !!openTime && !!closeTime

  /* ── Handlers ──────────────────────────────────────────────────────── */

  function handleSaveSchedule() {
    if (!scheduleDirty || !scheduleValid) return
    doSave('schedule', {
      timezone: timezone.trim(),
      open_time: openTime,
      close_time: closeTime,
      working_days: workingDays,
    })
  }

  function handleSaveQuote() {
    if (!quoteDirty || quoteError) return
    doSave('quote', { quote_validity_days: Number(quoteValidityDays) })
  }

  function handleSmsRedirect() {
    if (!redirectDirty) return
    const next = smsRedirectTo.trim()
    const turningOff = !next && !!saved.smsRedirectTo

    if (turningOff) {
      setConfirm({
        section: 'redirect',
        fields: { sms_redirect_to: null },
        title: 'Remove SMS redirect',
        danger: true,
        confirmLabel: 'Yes, send to real customers',
        message: (
          <>
            <p>You are about to <strong>remove the SMS redirect</strong>.</p>
            <p className="mt-2">
              After this change, <strong>real customers will receive text messages</strong> directly
              to their phones. Make sure this is intentional and the system is production-ready.
            </p>
          </>
        ),
      })
      return
    }

    setConfirm({
      section: 'redirect',
      fields: { sms_redirect_to: next },
      title: 'Change SMS redirect',
      danger: false,
      confirmLabel: 'Set redirect',
      message: (
        <>
          <p>
            All outbound SMS will be redirected to{' '}
            <strong className="mono">{next}</strong> instead of the real recipient.
          </p>
          <p className="mt-2">This is a safe change — no real customers will receive messages.</p>
        </>
      ),
    })
  }

  // Toggles never change local state optimistically. The switch moves only
  // after the server confirms, so the UI can't drift out of sync with the DB.
  function handleTestOnly(next) {
    if (!next) {
      setConfirm({
        section: 'testOnly',
        fields: { test_only: false },
        title: 'Disable test mode',
        danger: true,
        confirmLabel: 'Yes, go live',
        message: (
          <>
            <p>You are about to <strong>disable test mode</strong>.</p>
            <p className="mt-2">
              The automation will begin sending messages to real customers. Confirm all templates
              are approved and the cadence is correct.
            </p>
          </>
        ),
      })
      return
    }
    setTestOnly(true)
    doSave('testOnly', { test_only: true }).then((r) => { if (!r.ok) setTestOnly(false) })
  }

  async function handleDemoMode(next) {
    if (next && !testOnly) return // guarded by `disabled`, belt-and-braces
    // Move the switch straight away so the click feels responsive, then roll
    // back if the server rejects it.
    setDemoMode(next)
    const res = await doSave('demo', { demo_mode: next })
    if (!res.ok) setDemoMode(!next)
  }

  const isTestActive = !!(calendar?.sms_redirect_to || calendar?.test_only)

  return (
    <div className="space-y-5">
      {/* ── Live delivery status ──────────────────────────────────────── */}
      <div
        role="status"
        className="flex items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3"
        style={{
          borderColor: isTestActive ? 'var(--signal-warn-rule)' : 'var(--signal-neg-rule)',
          background: isTestActive ? 'var(--signal-warn-soft)' : 'var(--signal-neg-soft)',
          color: isTestActive ? 'var(--tone-warn-ink)' : 'var(--tone-neg-ink)',
        }}
      >
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: 'currentColor' }} aria-hidden="true" />
        <div className="text-[12.5px] leading-relaxed">
          <strong className="font-semibold">
            {isTestActive ? 'Test mode is active.' : 'Live — real customers are receiving messages.'}
          </strong>{' '}
          {isTestActive ? (
            <>
              {calendar?.sms_redirect_to && (
                <>All SMS are redirected to <code className="mono">{calendar.sms_redirect_to}</code>. </>
              )}
              {calendar?.test_only && <>Test-only mode is on. </>}
              Real customers are not receiving messages.
            </>
          ) : (
            <>Changes to delivery controls take effect immediately.</>
          )}
        </div>
      </div>

      {/* ── Schedule ──────────────────────────────────────────────────── */}
      <Section
        title="Business hours"
        description="Follow-ups are only sent inside these hours, in this timezone."
        footer={
          <>
            <button
              onClick={handleSaveSchedule}
              disabled={busy === 'schedule' || !scheduleDirty || !scheduleValid}
              className="btn btn-primary"
            >
              {busy === 'schedule' ? 'Saving…' : 'Save hours & days'}
            </button>
            {scheduleDirty && !status.schedule && (
              <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                Unsaved changes
              </span>
            )}
            <SaveState state={status.schedule} />
          </>
        }
      >
        <Field
          label="Timezone"
          htmlFor="tz"
          hint="IANA name. All cadence timing is calculated in this zone."
          error={tzError}
        >
          <input
            id="tz"
            type="text"
            list="tz-options"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="field mono w-full max-w-xs"
            placeholder="America/Chicago"
            aria-invalid={!!tzError}
          />
          <datalist id="tz-options">
            {COMMON_TZ.map((tz) => <option key={tz} value={tz} />)}
          </datalist>
        </Field>

        <Field label="Opening hours" hint="Messages are held outside this window." error={hoursError}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="field"
              aria-label="Opening time"
              aria-invalid={!!hoursError}
            />
            <span style={{ color: 'var(--ink-faint)' }}>to</span>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="field"
              aria-label="Closing time"
              aria-invalid={!!hoursError}
            />
          </div>
        </Field>

        <Field label="Working days" hint="Business-day offsets skip the days left off." error={daysError}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Working days">
            {DAYS.map(({ n, label, full }) => {
              const on = workingDays.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  aria-label={full}
                  onClick={() => toggleDay(n)}
                  className="h-8 w-12 rounded-[var(--radius)] border text-[12.5px] font-medium transition-colors"
                  style={
                    on
                      ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-rule)', color: 'var(--accent-ink)' }
                      : { background: 'var(--paper-raised)', borderColor: 'var(--rule)', color: 'var(--ink-faint)' }
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
      </Section>

      {/* ── Quote validity ────────────────────────────────────────────── */}
      <Section
        title="Quote validity"
        description="How long a sent quote stays live before follow-ups stop."
        footer={
          <>
            <button
              onClick={handleSaveQuote}
              disabled={busy === 'quote' || !quoteDirty || !!quoteError}
              className="btn btn-primary"
            >
              {busy === 'quote' ? 'Saving…' : 'Save'}
            </button>
            {quoteDirty && !status.quote && (
              <span className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                Unsaved changes
              </span>
            )}
            <SaveState state={status.quote} />
          </>
        }
      >
        <Field
          label="Validity window"
          htmlFor="quote-days"
          hint="Days after a quote is sent before follow-ups are suppressed."
          error={quoteError}
        >
          <div className="flex items-center gap-2">
            <input
              id="quote-days"
              type="number"
              min={LIMITS.quoteValidityDays.min}
              max={LIMITS.quoteValidityDays.max}
              value={quoteValidityDays}
              onChange={(e) => setQuoteValidityDays(parseInt(e.target.value, 10) || 0)}
              className="field w-24"
              aria-invalid={!!quoteError}
            />
            <span className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>days</span>
          </div>
        </Field>
      </Section>

      {/* ── Delivery controls ─────────────────────────────────────────── */}
      <Section
        title="Delivery controls"
        note={<span className="text-[12px] font-medium" style={{ color: 'var(--tone-neg-ink)' }}>Affects real customers</span>}
        description="Whether messages reach real phones. Risky changes ask for confirmation, and every change is written to the audit log."
      >
        <Field
          label="SMS redirect"
          htmlFor="sms-redirect"
          hint="All outbound SMS go to this number instead of the real recipient. Clear to disable."
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="sms-redirect"
              type="tel"
              value={smsRedirectTo}
              onChange={(e) => setSmsRedirectTo(e.target.value)}
              placeholder="+1 555 000 0000"
              className="field mono w-52"
            />
            <button
              onClick={handleSmsRedirect}
              disabled={busy === 'redirect' || !redirectDirty}
              className="btn btn-quiet"
            >
              {busy === 'redirect' ? 'Saving…' : 'Update'}
            </button>
            <SaveState state={status.redirect} />
          </div>
        </Field>

        <Field
          label="Test-only mode"
          hint="When on, the automation skips sending messages entirely. Turn off to go live."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={testOnly}
              onChange={handleTestOnly}
              disabled={busy === 'testOnly'}
              tone="warn"
              label="Test-only mode"
            />
            <span className="text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>
              {testOnly ? 'On. Nothing is sent to customers.' : 'Off. Messages are sent to real customers.'}
            </span>
            <SaveState state={status.testOnly} />
          </div>
        </Field>

        <Field
          label="Demo mode"
          hint="Compresses follow-up timings to minutes for sales demos. Requires test-only mode."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Switch
                checked={demoMode}
                onChange={handleDemoMode}
                disabled={busy === 'demo' || (!testOnly && !demoMode)}
                tone="alt"
                label="Demo mode"
              />
              <span className="text-[12.5px]" style={{ color: 'var(--ink-secondary)' }}>
                {demoMode ? 'On. Timings are compressed to minutes.' : 'Off'}
              </span>
              {!testOnly && !demoMode && (
                <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                  Enable test-only mode first
                </span>
              )}
              <SaveState state={status.demo} />
            </div>

            <div
              className="rounded-[var(--radius)] border px-3.5 py-3"
              style={{ background: 'var(--paper-sunken)', borderColor: 'var(--rule-faint)', opacity: demoMode ? 1 : 0.6 }}
            >
              <label htmlFor="poll" className="mb-1.5 block text-[12px] font-medium" style={{ color: 'var(--ink-secondary)' }}>Poller interval</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="poll"
                  type="number"
                  min={LIMITS.demoPollInterval.min}
                  max={LIMITS.demoPollInterval.max}
                  value={demoPollInterval}
                  onChange={(e) => setDemoPollInterval(parseInt(e.target.value, 10) || 0)}
                  className="field w-24"
                  aria-invalid={!!pollError}
                  aria-describedby="poll-hint"
                />
                <span className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>seconds</span>
                <button
                  onClick={() => !pollError && pollDirty && doSave('poll', { demo_poll_interval_seconds: Number(demoPollInterval) })}
                  disabled={busy === 'poll' || !pollDirty || !!pollError}
                  className="btn btn-quiet h-8 text-[12.5px]"
                >
                  {busy === 'poll' ? 'Saving…' : 'Save'}
                </button>
                <SaveState state={status.poll} />
              </div>
              {pollError ? (
                <p className="mt-1.5 text-[11.5px] font-medium" style={{ color: 'var(--tone-neg-ink)' }}>
                  {pollError}
                </p>
              ) : (
                <p id="poll-hint" className="mt-1.5 text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>
                  The follow-up poller must run at this interval for demo mode to feel live
                  ({LIMITS.demoPollInterval.min}–{LIMITS.demoPollInterval.max}s).
                </p>
              )}
            </div>
          </div>
        </Field>
      </Section>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={() => {
          const { section, fields } = confirm
          setConfirm(null)
          doSave(section, fields).then((res) => {
            if (!res.ok) return
            if ('test_only' in fields) setTestOnly(fields.test_only)
            if ('demo_mode' in fields) setDemoMode(fields.demo_mode)
            if ('sms_redirect_to' in fields) setSmsRedirectTo(fields.sms_redirect_to ?? '')
          })
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
