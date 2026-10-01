import { getTemplates } from '@/lib/queries'
import Link from 'next/link'
import Badge from '@/components/Badge'
import EmptyState from '@/components/EmptyState'
import { templateLabel, friendlyBody } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Templates' }

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
    <div className="surface rise flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b px-5 py-4"
        style={{ borderColor: 'var(--rule-faint)' }}
      >
        <h1 className="page-title text-[15px]">Message templates</h1>
        <p className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
          Editing bumps the version and requires re-approval before messages send.
        </p>
        <span className="eyebrow ml-auto">
          <span className="tabular" style={{ color: 'var(--ink-secondary)' }}>{templates.length}</span>
          {' '}template{templates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {fetchError && (
        <div
          className="shrink-0 border-b px-5 py-3 text-[12.5px]"
          style={{
            borderColor: 'var(--signal-neg-rule)',
            background: 'var(--signal-neg-soft)',
            color: 'var(--tone-neg-ink)',
          }}
        >
          {fetchError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {templates.length === 0 && !fetchError ? (
          <EmptyState title="No templates" description="The message_templates table is empty." />
        ) : (
          <table className="data-table min-w-155">
            <thead>
              <tr>
                <th>Template</th>
                <th>Channel</th>
                <th className="hidden sm:table-cell">Version</th>
                <th>Approved</th>
                <th className="hidden md:table-cell">Active</th>
                <th className="hidden lg:table-cell">Preview</th>
              </tr>
            </thead>
            {[...JOURNEY_ORDER, 'other'].map((group) => {
              const items = grouped[group]
              if (!items?.length) return null
              return (
                <tbody key={group}>
                  {/* Group rule: a labelled band, so a long list stays navigable. */}
                  <tr>
                    <td
                      colSpan={6}
                      className="py-1.5!"
                      style={{ background: 'var(--paper-sunken)', borderColor: 'var(--rule-faint)' }}
                    >
                      <span className="eyebrow">{JOURNEY_LABELS[group] ?? group}</span>
                      <span className="counter ml-2">{items.length}</span>
                    </td>
                  </tr>
                  {items.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link
                          href={`/templates/${encodeURIComponent(t.template_key)}`}
                          className="link-subtle"
                          title={t.template_key}
                        >
                          {templateLabel(t.template_key)}
                        </Link>
                        <div className="mono mt-0.5 text-[10.5px]" style={{ color: 'var(--ink-faint)' }}>
                          {t.template_key}
                        </div>
                      </td>
                      <td>
                        <Badge label={t.channel} status={t.channel === 'sms' ? 'sent' : 'pending'} />
                      </td>
                      <td className="tabular hidden text-[12px] sm:table-cell" style={{ color: 'var(--ink-muted)' }}>
                        v{t.version}
                      </td>
                      <td>
                        {t.approved
                          ? <Badge label="Approved" status="sent" />
                          : <Badge label="Not approved" status="failed" />}
                      </td>
                      <td className="hidden md:table-cell">
                        {t.is_active
                          ? <Badge label="Active" status="active" />
                          : <Badge label="Inactive" status="cancelled" />}
                      </td>
                      <td className="hidden max-w-xs lg:table-cell">
                        <p className="truncate text-[12px]" style={{ color: 'var(--ink-muted)' }} title={t.body}>
                          {friendlyBody(t.body).substring(0, 90)}{t.body?.length > 90 ? '…' : ''}
                        </p>
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
