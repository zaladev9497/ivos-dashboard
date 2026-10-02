import { getTemplates } from '@/lib/queries'
import TemplatesView from './TemplatesView'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Templates' }

export default async function TemplatesPage() {
  let templates = []
  let fetchError = null
  try { templates = await getTemplates() } catch (e) { fetchError = e.message }

  return <TemplatesView templates={templates} fetchError={fetchError} />
}
