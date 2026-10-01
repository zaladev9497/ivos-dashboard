import { getTemplates } from '@/lib/queries'
import Link from 'next/link'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import { templateLabel, friendlyBody } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const JOURNEY_ORDER = ['retrofit', 'nc', 'service', 'post_sale']
const JOURNEY_LABELS = { retrofit: 'Retrofit', nc: 'New Construction', service: 'Service', post_sale: 'Post Sale' }

function journeyGroup(key) {
  const prefix = key.split('.')[0]
  return JOURNEY_ORDER.includes(prefix) ? prefix : 'other'
}

export default async function TemplatesPage() {
  let templates = []
  let fetchError = null
  try { templates = await getTemplates() } catch (e) { fetchError = e.message }

  const grouped = {}
  for (const t of templates) {
    const g = journeyGroup(t.template_key)
    if (!grouped[g]) grouped[g] = []
    grouped[g].push(t)
  }

  const th = 'px-3 py-1.5 text-left font-medium'
  const td = 'px-3 py-1.5'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        <span className="text-[13px] font-medium text-slate-800">Message templates</span>
        <span className="text-xs text-slate-400">Editing bumps the version and requires re-approval before messages send.</span>
        <span className="ml-auto text-xs tabular-nums text-slate-500">{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
      </div>

      {fetchError && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fetchError}</div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {templates.length === 0 && !fetchError ? (
          <EmptyState title="No templates" description="message_templates table is empty." />
        ) : (
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 shadow-[inset_0_-1px_0] shadow-slate-200">
              <tr>
                <th className={th}>Template key</th>
                <th className={th}>Channel</th>
                <th className={`${th} hidden sm:table-cell`}>Version</th>
                <th className={th}>Approved</th>
                <th className={`${th} hidden md:table-cell`}>Active</th>
                <th className={`${th} hidden lg:table-cell`}>Preview</th>
              </tr>
            </thead>
            {[...JOURNEY_ORDER, 'other'].map(group => {
              const items = grouped[group]
              if (!items?.length) return null
              return (
                <tbody key={group} className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/60">
                    <td colSpan={6} className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {JOURNEY_LABELS[group] ?? group} <span className="font-normal text-slate-400">({items.length})</span>
                    </td>
                  </tr>
                  {items.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className={td}>
                        <Link href={`/templates/${encodeURIComponent(t.template_key)}`} className="font-medium text-slate-800 hover:text-blue-600" title={t.template_key}>
                          {templateLabel(t.template_key)}
                        </Link>
                        <div className="font-mono text-[11px] text-slate-400">{t.template_key}</div>
                      </td>
                      <td className={td}><Badge label={t.channel} status={t.channel === 'sms' ? 'sent' : 'pending'} /></td>
                      <td className={`${td} hidden text-xs text-slate-500 sm:table-cell`}>v{t.version}</td>
                      <td className={td}>
                        {t.approved
                          ? <Badge label="Approved" status="sent" />
                          : <Badge label="Not approved" status="failed" />}
                      </td>
                      <td className={`${td} hidden md:table-cell`}>
                        {t.is_active
                          ? <Badge label="Active" status="sent" />
                          : <Badge label="Inactive" status="cancelled" />}
                      </td>
                      <td className={`${td} hidden max-w-xs truncate text-xs text-slate-400 lg:table-cell`} title={t.body}>
                        {friendlyBody(t.body).substring(0, 90)}{t.body?.length > 90 ? '…' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </table>
        )}
      </div>
    </div>
  )
}
