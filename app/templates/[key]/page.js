import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTemplate, getTemplateHistory, getAuditLogs } from '@/lib/queries'
import TemplateEditor from './TemplateEditor'

export const dynamic = 'force-dynamic'

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
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/templates" className="hover:text-slate-800">Templates</Link>
        <span>/</span>
        <span className="font-mono text-slate-800">{templateKey}</span>
      </div>
      <TemplateEditor template={template} history={history} auditLogs={auditLogs} />
    </div>
  )
}
