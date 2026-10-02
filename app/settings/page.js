import { getBusinessCalendar } from '@/lib/queries'
import SettingsForm from './SettingsForm'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  let calendar = null
  try {
    calendar = await getBusinessCalendar()
  } catch {
    // env not configured yet
  }

  return (
    <div className="page rise" style={{ maxWidth: 920 }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-lede">Business hours, quote timing and whether messages reach real customers.</p>
        </div>
        {calendar?.updated_at && (
          <span className="pb-0.5 text-[12px]" style={{ color: 'var(--ink-faint)' }}>
            Last updated {formatDate(calendar.updated_at)}
          </span>
        )}
      </header>

      {!calendar && (
        <div
          className="rounded-[var(--radius)] border px-3.5 py-2.5 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-warn-rule)',
            background: 'var(--signal-warn-soft)',
            color: 'var(--tone-warn-ink)',
          }}
        >
          Could not load business calendar. Check that <code className="mono text-[11.5px]">SUPABASE_URL</code> and{' '}
          <code className="mono text-[11.5px]">SUPABASE_SERVICE_ROLE_KEY</code> are set.
        </div>
      )}

      <SettingsForm calendar={calendar} />
    </div>
  )
}
