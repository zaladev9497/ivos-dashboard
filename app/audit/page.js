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

  return (
    <div className="surface rise flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ── Filter rail ─────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-3.5"
        style={{ borderColor: 'var(--rule-faint)' }}
      >
        {tableNames.map((t) => {
          const active = tableName === t
          return (
            <Link
              key={t || 'all'}
              href={buildUrl({ table: t })}
              aria-current={active ? 'true' : undefined}
              className="rounded-full border px-2.5 py-0.75 text-[11.5px] font-medium transition-colors"
              style={
                active
                  ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--paper)' }
                  : { background: 'var(--paper-raised)', borderColor: 'var(--rule)', color: 'var(--ink-muted)' }
              }
            >
              {t ? t.replace(/_/g, ' ') : 'All tables'}
            </Link>
          )
        })}

        {actor && (
          <Link
            href={buildUrl({ actor: '' })}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.75 text-[11.5px] font-medium"
            style={{
              background: 'var(--accent-soft)',
              borderColor: 'var(--accent-rule)',
              color: 'var(--accent-ink)',
            }}
          >
            {actor}
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Clear actor filter</span>
          </Link>
        )}

        <span className="eyebrow ml-auto">
          <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{total.toLocaleString()}</span>
          {' '}entr{total === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {missing && (
        <div
          className="shrink-0 border-b px-5 py-3 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-warn-rule)',
            background: 'var(--signal-warn-soft)',
            color: 'var(--tone-warn-ink)',
          }}
        >
          The <code className="mono text-[11.5px]">dashboard_audit</code> table does not exist yet. Run the
          migration to enable audit logging.
        </div>
      )}

      {/* ── Log ─────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-auto">
        {logs.length === 0 && !missing ? (
          <EmptyState
            title="No audit entries"
            description="Mutations appear here once the table exists and actions are taken."
          />
        ) : (
          <table className="data-table min-w-155">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th className="hidden md:table-cell">Table</th>
                <th className="hidden md:table-cell">Row</th>
                <th className="hidden lg:table-cell">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td><Timestamp iso={log.occurred_at} inline /></td>
                  <td>
                    <Link href={buildUrl({ actor: log.actor })} className="link-subtle text-[12.5px]">
                      {log.actor}
                    </Link>
                  </td>
                  <td className="mono text-[11.5px]" style={{ color: 'var(--ink-secondary)' }}>
                    {log.action}
                  </td>
                  <td className="mono hidden text-[11.5px] md:table-cell" style={{ color: 'var(--ink-muted)' }}>
                    {log.table_name ?? '—'}
                  </td>
                  <td className="mono hidden text-[11.5px] md:table-cell" title={log.row_id}>
                    {log.row_id ? (
                      log.table_name === 'journeys' || log.table_name === 'leads' ? (
                        <Link href={`/leads/${log.row_id}`} className="link">
                          {String(log.row_id).slice(0, 8)}…
                        </Link>
                      ) : (
                        <span style={{ color: 'var(--ink-faint)' }}>
                          {String(log.row_id).slice(0, 8) + (String(log.row_id).length > 8 ? '…' : '')}
                        </span>
                      )
                    ) : (
                      <span style={{ color: 'var(--ink-faint)' }}>—</span>
                    )}
                  </td>
                  <td className="hidden max-w-sm lg:table-cell">
                    <p className="truncate text-[12px]" style={{ color: 'var(--ink-muted)' }} title={log.note}>
                      {log.note || '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3"
          style={{ borderColor: 'var(--rule-faint)', background: 'var(--paper-sunken)' }}
        >
          <p className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="tabular font-medium" style={{ color: 'var(--ink-secondary)' }}>
              {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()}
            </span>
            {' of '}
            <span className="tabular font-medium" style={{ color: 'var(--ink-secondary)' }}>
              {total.toLocaleString()}
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="eyebrow mr-1 hidden sm:inline" style={{ color: 'var(--ink-faint)' }}>
              Page {page} / {totalPages}
            </span>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })} className="btn btn-quiet h-7 px-2.5">
                Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })} className="btn btn-quiet h-7 px-2.5">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
