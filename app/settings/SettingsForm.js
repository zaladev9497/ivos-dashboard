'use client'
import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { updateBusinessCalendar } from './actions'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

// Sections with their fields
// dangerous = requires confirmation dialog before saving

function Field({ label, hint, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 items-start py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function SettingsForm({ calendar }) {
  // Regular fields
  const [timezone, setTimezone] = useState(calendar?.timezone ?? '')
  const [openTime, setOpenTime] = useState(calendar?.open_time ?? '')
  const [closeTime, setCloseTime] = useState(calendar?.close_time ?? '')
  const [quoteValidityDays, setQuoteValidityDays] = useState(calendar?.quote_validity_days ?? 30)
  const [workingDays, setWorkingDays] = useState(calendar?.working_days ?? [])

  // Dangerous fields — local staging state
  const [smsRedirectTo, setSmsRedirectTo] = useState(calendar?.sms_redirect_to ?? '')
  const [testOnly, setTestOnly] = useState(calendar?.test_only ?? false)
  const [demoMode, setDemoMode] = useState(calendar?.demo_mode ?? false)
  const [demoPollInterval, setDemoPollInterval] = useState(calendar?.demo_poll_interval_seconds ?? 10)

  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  // Confirmation dialog state
  const [confirm, setConfirm] = useState(null) // { fields, title, message, danger }

  function toggleDay(day) {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  async function doSave(fields) {
    setSaving(true)
    setResult(null)
    const res = await updateBusinessCalendar(fields)
    setSaving(false)
    setResult(res)
    if (res.ok) {
      // Sync local state with what was saved
      if ('test_only' in fields) setTestOnly(fields.test_only)
      if ('sms_redirect_to' in fields) setSmsRedirectTo(fields.sms_redirect_to)
      if ('demo_mode' in fields) setDemoMode(fields.demo_mode)
      if ('demo_poll_interval_seconds' in fields) setDemoPollInterval(fields.demo_poll_interval_seconds)
    }
  }

  function handleSaveSchedule() {
    doSave({ open_time: openTime, close_time: closeTime, working_days: workingDays, timezone })
  }

  function handleSaveQuoteValidity() {
    doSave({ quote_validity_days: Number(quoteValidityDays) })
  }

  function handleSmsRedirectChange() {
    const newVal = smsRedirectTo.trim()
    const turningOff = !newVal && !!calendar?.sms_redirect_to
    const turningOn = !!newVal && !calendar?.sms_redirect_to
    const changing = !!newVal && !!calendar?.sms_redirect_to && newVal !== calendar.sms_redirect_to

    if (turningOff) {
      setConfirm({
        fields: { sms_redirect_to: null },
        title: 'Remove SMS redirect',
        danger: true,
        message: (
          <>
            <p>You are about to <strong>remove the SMS redirect</strong>.</p>
            <p className="mt-2">After this change, <strong>real customers will receive text messages</strong> directly to their phones. Make sure this is intentional and that the system is fully production-ready before proceeding.</p>
          </>
        ),
        confirmLabel: 'Yes, send to real customers',
      })
    } else if (turningOn || changing) {
      setConfirm({
        fields: { sms_redirect_to: newVal },
        title: 'Change SMS redirect',
        danger: false,
        message: (
          <>
            <p>All outbound SMS will be redirected to <strong className="font-mono">{newVal}</strong> instead of the real recipient.</p>
            <p className="mt-2">This is a safe change — no real customers will receive messages.</p>
          </>
        ),
        confirmLabel: 'Set redirect',
      })
    } else {
      doSave({ sms_redirect_to: newVal || null })
    }
  }

  function handleTestOnlyChange(checked) {
    if (!checked && calendar?.test_only) {
      setConfirm({
        fields: { test_only: false },
        title: 'Disable test mode',
        danger: true,
        message: (
          <>
            <p>You are about to <strong>disable test mode</strong>.</p>
            <p className="mt-2">The automation will begin sending messages to real customers. Confirm this is intentional and that all templates are approved and the cadence is correct.</p>
          </>
        ),
        confirmLabel: 'Yes, disable test mode',
      })
      // Reset the toggle visually — will update if confirmed
      setTestOnly(true)
    } else {
      doSave({ test_only: checked })
    }
  }

  function handleDemoModeChange(checked) {
    if (checked && !testOnly) return // guard: test_only must be on
    if (!checked && calendar?.demo_mode) {
      setConfirm({
        fields: { demo_mode: false },
        title: 'Disable demo mode',
        danger: false,
        message: <p>Demo mode will be turned off. Follow-up timings will return to normal cadence.</p>,
        confirmLabel: 'Disable demo mode',
      })
      setDemoMode(true) // hold toggle until confirmed
    } else {
      doSave({ demo_mode: checked })
    }
  }

  const isTestActive = !!(calendar?.sms_redirect_to || calendar?.test_only)

  return (
    <div className="space-y-6">
      {result?.error && (
        <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      )}
      {result?.ok && (
        <div className="rounded bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Settings saved.
        </div>
      )}

      {/* Test mode status banner */}
      {isTestActive && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Test mode is active.</strong>
          {calendar?.sms_redirect_to && <> All SMS are redirected to <code className="font-mono">{calendar.sms_redirect_to}</code>.</>}
          {calendar?.test_only && <> <code className="font-mono">test_only</code> flag is set.</>}
          {' '}Real customers are not receiving messages.
        </div>
      )}

      {/* Business hours */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Business hours & working days</span>
        </div>
        <div className="px-4 divide-y divide-slate-50">
          <Field label="Timezone">
            <input
              type="text"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full max-w-xs rounded border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
              placeholder="e.g. America/Chicago"
            />
          </Field>
          <Field label="Open time">
            <input
              type="time"
              value={openTime}
              onChange={e => setOpenTime(e.target.value)}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </Field>
          <Field label="Close time">
            <input
              type="time"
              value={closeTime}
              onChange={e => setCloseTime(e.target.value)}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </Field>
          <Field label="Working days">
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded px-3 py-1 text-sm font-medium border transition-colors ${
                    workingDays.includes(day)
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save hours & days'}
          </button>
        </div>
      </div>

      {/* Quote validity */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quote validity</span>
        </div>
        <div className="px-4 divide-y divide-slate-50">
          <Field label="Quote validity" hint="Days after quote sent before follow-ups are suppressed">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={quoteValidityDays}
                onChange={e => setQuoteValidityDays(parseInt(e.target.value, 10) || 30)}
                className="w-24 rounded border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <span className="text-sm text-slate-500">days</span>
            </div>
          </Field>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={handleSaveQuoteValidity}
            disabled={saving}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Dangerous settings */}
      <div className="rounded-lg border border-red-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-red-100 px-4 py-2.5">
          <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Delivery controls — handle with care</span>
        </div>
        <div className="px-4 divide-y divide-slate-50">
          <Field
            label="SMS redirect"
            hint="All outbound SMS go to this number instead of the real recipient. Clear to disable."
          >
            <div className="flex items-center gap-2">
              <input
                type="tel"
                value={smsRedirectTo}
                onChange={e => setSmsRedirectTo(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-48 rounded border border-slate-200 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                onClick={handleSmsRedirectChange}
                disabled={saving}
                className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
              >
                Update
              </button>
            </div>
          </Field>

          <Field
            label="Test-only mode"
            hint="When on, the automation skips sending messages entirely. Turn off to go live."
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTestOnlyChange(!testOnly)}
                disabled={saving}
                className={`w-10 h-5 rounded-full transition-colors disabled:opacity-40 ${testOnly ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${testOnly ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-slate-600">
                {testOnly ? 'Test mode ON — no real messages are sent' : 'Test mode OFF — real messages will be sent'}
              </span>
            </div>
          </Field>

          <Field
            label="Demo mode"
            hint="Compresses follow-up timings to minutes for sales demos. Requires test-only mode."
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleDemoModeChange(!demoMode)}
                disabled={saving || (!testOnly && !demoMode)}
                className={`w-10 h-5 rounded-full transition-colors disabled:opacity-40 ${demoMode ? 'bg-violet-600' : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${demoMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-slate-600">
                {demoMode ? 'Demo mode ON — timings compressed to minutes' : 'Demo mode OFF'}
              </span>
              {!testOnly && !demoMode && (
                <span className="text-xs text-slate-400">Enable test-only mode first</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Poller interval:</span>
              <input
                type="number"
                min="1"
                max="3600"
                value={demoPollInterval}
                onChange={e => setDemoPollInterval(parseInt(e.target.value, 10) || 10)}
                className="w-20 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <span className="text-xs text-slate-500">seconds</span>
              <button
                onClick={() => doSave({ demo_poll_interval_seconds: demoPollInterval })}
                disabled={saving}
                className="rounded bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              The follow-up poller must run at this interval for demo mode to feel live.
            </p>
          </Field>
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={() => {
          const fields = confirm.fields
          setConfirm(null)
          doSave(fields)
        }}
        onCancel={() => {
          // Reset local state to match current saved state
          setSmsRedirectTo(calendar?.sms_redirect_to ?? '')
          setTestOnly(calendar?.test_only ?? false)
          setDemoMode(calendar?.demo_mode ?? false)
          setDemoPollInterval(calendar?.demo_poll_interval_seconds ?? 10)
          setConfirm(null)
        }}
      />
    </div>
  )
}
