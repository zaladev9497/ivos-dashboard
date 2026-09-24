import Link from 'next/link'
import { getAuditLogs } from '@/lib/queries'
import Timestamp from '@/components/Timestamp'
import EmptyState from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function AuditPage({ searchParams }) {
  const params = await searchParams
  const page = parseInt(params?.page ?? '1', 10)
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

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Audit log</h1>

      {missing && (
        <div className="rounded bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          The <code className="font-mono">dashboard_audit</code> table does not exist yet. Run the migration to enable audit logging.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Table:</span>
        {tableNames.map(t => (
          <Link
            key={t || 'all'}
            href={buildUrl({ table: t })}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              tableName === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t || 'All'}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {logs.length === 0 && !missing ? (
          <EmptyState title="No audit entries" description="Mutations will appear here once the table exists and actions are taken." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">Actor</th>
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Table</th>
                <th className="px-4 py-2 text-left">Row</th>
                <th className="px-4 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Timestamp iso={log.occurred_at} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    <Link href={buildUrl({ actor: log.actor })} className="text-xs hover:text-blue-600">
                      {log.actor}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{log.action}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.table_name ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400 max-w-30 truncate" title={log.row_id}>
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
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs">
                    <p className="truncate" title={log.note}>{log.note || '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
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
