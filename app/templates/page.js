import { getTemplates } from '@/lib/queries'
import Link from 'next/link'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-800">Message Templates</h1>
        <p className="text-xs text-slate-400">Editing bumps the version and requires re-approval before messages send.</p>
      </div>

      {fetchError && <div className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{fetchError}</div>}

      {templates.length === 0 && !fetchError && <EmptyState title="No templates" description="message_templates table is empty." />}

      {[...JOURNEY_ORDER, 'other'].map(group => {
        const items = grouped[group]
        if (!items?.length) return null
        return (
          <div key={group}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {JOURNEY_LABELS[group] ?? group} ({items.length})
            </h2>
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left">Template key</th>
                    <th className="px-4 py-2 text-left">Channel</th>
                    <th className="px-4 py-2 text-left">Version</th>
                    <th className="px-4 py-2 text-left">Approved</th>
                    <th className="px-4 py-2 text-left">Active</th>
                    <th className="px-4 py-2 text-left">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/templates/${encodeURIComponent(t.template_key)}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {t.template_key}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5"><Badge label={t.channel} status={t.channel === 'sms' ? 'sent' : 'pending'} /></td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">v{t.version}</td>
                      <td className="px-4 py-2.5">
                        {t.approved
                          ? <Badge label="Approved" status="sent" />
                          : <Badge label="Not approved" status="failed" />}
                      </td>
                      <td className="px-4 py-2.5">
                        {t.is_active
                          ? <Badge label="Active" status="sent" />
                          : <Badge label="Inactive" status="cancelled" />}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate" title={t.body}>
                        {t.body?.substring(0, 80)}{t.body?.length > 80 ? '…' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
