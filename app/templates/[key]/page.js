import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTemplate, getTemplateHistory, getAuditLogs } from '@/lib/queries'
import TemplateEditor from './TemplateEditor'
import Badge from '@/components/Badge'
import { templateLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Template' }

export default async function TemplatePage({ params }) {
  const { key } = await params
  const templateKey = decodeURIComponent(key)

  const [template, history] = await Promise.all([
    getTemplate(templateKey).catch(() => null),
    getTemplateHistory(templateKey).catch(() => []),
  ])

  if (!template) notFound()

  // Fetch audit entries for this template key
  const auditResult = await getAuditLogs({ tableName: 'message_templates' }).catch(() => ({ logs: [] }))
  const auditLogs = auditResult.logs.filter(l =>
    l.note?.includes(templateKey) || history.some(h => h.id === l.row_id)
  )

  const channel = template.channel === 'sms' ? 'SMS' : template.channel

  return (
    <div className="page rise" style={{ gap: '1.25rem' }}>
      <header className="space-y-2.5">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-[12px] transition-colors hover:text-[var(--accent)]"
          style={{ color: 'var(--ink-muted)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Templates
        </Link>

        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title" style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>{templateLabel(templateKey)}</h1>
            {!template.is_active
              ? <Badge label="Inactive" status="cancelled" dot={false} />
              : template.approved
                ? <Badge label="Live" status="active" />
                : <Badge label="Needs approval" status="medium" />}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
            <span className="mono text-[12px]">{templateKey}</span>
            <span aria-hidden="true" style={{ color: 'var(--ink-faint)' }}>·</span>
            <span>{channel}</span>
            <span aria-hidden="true" style={{ color: 'var(--ink-faint)' }}>·</span>
            <span className="tabular">Version {template.version}</span>
          </p>
        </div>
      </header>

      <TemplateEditor template={template} history={history} auditLogs={auditLogs} />
    </div>
  )
}
