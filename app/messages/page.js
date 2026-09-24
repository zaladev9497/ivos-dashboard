import { getMessages, getScheduledMessages, getBusinessCalendar } from '@/lib/queries'
import MessagesView from './MessagesView'

export const dynamic = 'force-dynamic'

export default async function MessagesPage({ searchParams }) {
  const params = await searchParams
  const tab = params?.tab ?? 'sent'
  const page = parseInt(params?.page ?? '1', 10)
  const direction = params?.direction ?? ''
  const deliveryStatus = params?.delivery_status ?? ''
  const purpose = params?.purpose ?? ''
  const showTest = params?.show_test === '1'
  const state = params?.state ?? ''
  const channel = params?.channel ?? ''

  let sentResult = { messages: [], total: 0, pageSize: 50 }
  let scheduledResult = { messages: [], total: 0, pageSize: 50 }
  let fetchError = null
  let demoMode = false
  let demoPollInterval = 10

  try {
    const [messages, sched, calendar] = await Promise.all([
      tab === 'sent' ? getMessages({ page, direction, deliveryStatus, purpose, showTest }) : Promise.resolve(sentResult),
      tab === 'scheduled' ? getScheduledMessages({ page, state, channel, showTest }) : Promise.resolve(scheduledResult),
      getBusinessCalendar().catch(() => null),
    ])
    sentResult = tab === 'sent' ? messages : sentResult
    scheduledResult = tab === 'scheduled' ? sched : scheduledResult
    demoMode = !!(calendar?.demo_mode)
    demoPollInterval = calendar?.demo_poll_interval_seconds ?? 10
  } catch (e) {
    fetchError = e.message
  }

  return (
    <MessagesView
      tab={tab}
      sentResult={sentResult}
      scheduledResult={scheduledResult}
      page={page}
      filters={{ direction, deliveryStatus, purpose, showTest, state, channel }}
      fetchError={fetchError}
      demoMode={demoMode}
      demoPollInterval={demoPollInterval}
    />
  )
}
