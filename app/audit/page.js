import Link from 'next/link'
import { getAuditLogs, safePage } from '@/lib/queries'
import Timestamp from '@/components/Timestamp'
import EmptyState from '@/components/EmptyState'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit' }

export default async function AuditPage({ searchParams }) {
  const params = await searchParams
  const page = safePage(params?.page)
  const tableName = params?.table ?? ''
  const actor = params?.actor ?? ''

  const { logs, total, pageSize, missing } = await getAuditLogs({ page, tableName, actor })
  const totalPages = Math.ceil(total / pageSize)

  const tableNames = [
    '', 'cadence_steps', 'message_templates', 'business_calendar',
    'journeys', 'scheduled_messages', 'operations_exceptions',
  ]

  function buildUrl(overrides) {
    const p = new URLSearchParams({ page: '1', ...(tableName && { table: tableName }), ...(actor && { actor }) })
    Object.entries(overrides).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k) })
    return `/audit?${p.toString()}`
  }

  const th = 'px-3 py-1.5 text-left font-medium'
  const td = 'px-3 py-1.5'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 px-3 py-2">
        {tableNames.map(t => (
          <Link
            key={t || 'all'}
            href={buildUrl({ table: t })}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              tableName === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t || 'All'}
          </Link>
        ))}
        {actor && (
          <Link href={buildUrl({ actor: '' })} className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
            actor: {actor} ✕
          </Link>
        )}
        <span className="ml-auto text-xs tabular-nums text-slate-500">{total} entr{total === 1 ? 'y' : 'ies'}</span>
      </div>

      {missing && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          The <code className="font-mono">dashboard_audit</code> table does not exist yet. Run the migration to enable audit logging.
        </div>
      )}

      {/* Scrollable table, sticky header */}
      <div className="min-h-0 flex-1 overflow-auto">
        {logs.length === 0 && !missing ? (
          <EmptyState title="No audit entries" description="Mutations will appear here once the table exists and actions are taken." />
        ) : (
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0] shadow-slate-200">
              <tr>
                <th className={th}>When</th>
                <th className={th}>Actor</th>
                <th className={th}>Action</th>
                <th className={`${th} hidden md:table-cell`}>Table</th>
                <th className={`${th} hidden md:table-cell`}>Row</th>
                <th className={`${th} hidden lg:table-cell`}>Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className={td}>
                    <Timestamp iso={log.occurred_at} inline />
                  </td>
                  <td className={`${td} text-slate-600`}>
                    <Link href={buildUrl({ actor: log.actor })} className="text-xs hover:text-blue-600">
                      {log.actor}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-600`}>{log.action}</td>
                  <td className={`${td} hidden font-mono text-xs text-slate-500 md:table-cell`}>{log.table_name ?? '—'}</td>
                  <td className={`${td} hidden font-mono text-xs text-slate-400 md:table-cell`} title={log.row_id}>
                    {log.row_id ? (
                      log.table_name === 'journeys' || log.table_name === 'leads' ? (
                        <Link href={`/leads/${log.row_id}`} className="text-blue-600 hover:underline">
                          {String(log.row_id).slice(0, 8)}…
                        </Link>
                      ) : (
                        String(log.row_id).slice(0, 8) + (String(log.row_id).length > 8 ? '…' : '')
                      )
                    ) : '—'}
                  </td>
                  <td className={`${td} hidden max-w-sm text-xs text-slate-500 lg:table-cell`}>
                    <p className="truncate" title={log.note}>{log.note || '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-3 py-1.5 text-xs text-slate-600">
          <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="rounded px-2 py-1 hover:bg-slate-100">‹ Prev</Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} className="rounded px-2 py-1 hover:bg-slate-100">Next ›</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
