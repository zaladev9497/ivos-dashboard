import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTemplate, getTemplateHistory, getAuditLogs } from '@/lib/queries'
import TemplateEditor from './TemplateEditor'
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

  return (
    <div className="page rise">
      <header>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px]">
          <Link
            href="/templates"
            className="transition-colors hover:text-[var(--accent)]"
            style={{ color: 'var(--ink-muted)' }}
          >
            Templates
          </Link>
          <span style={{ color: 'var(--ink-faint)' }}>/</span>
          <span className="mono" style={{ color: 'var(--ink-faint)' }}>{templateKey}</span>
        </nav>
        <h1 className="page-title mt-1" title={templateKey}>{templateLabel(templateKey)}</h1>
      </header>
      <TemplateEditor template={template} history={history} auditLogs={auditLogs} />
    </div>
  )
}
