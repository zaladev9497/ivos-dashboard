import { getBusinessCalendar } from '@/lib/queries'
import SettingsForm from './SettingsForm'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let calendar = null
  try {
    calendar = await getBusinessCalendar()
  } catch {
    // env not configured yet
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Settings</h1>
        {calendar?.updated_at && (
          <span className="text-xs text-slate-400">
            Last updated {formatDate(calendar.updated_at)}
          </span>
        )}
      </div>

      {!calendar && (
        <div className="rounded bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Could not load business calendar. Check that <code className="font-mono">SUPABASE_URL</code> and <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> are set.
        </div>
      )}

      <SettingsForm calendar={calendar} />
    </div>
  )
}
