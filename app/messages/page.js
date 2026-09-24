import { getMessages, getScheduledMessages } from '@/lib/queries'
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

  try {
    if (tab === 'sent') {
      sentResult = await getMessages({ page, direction, deliveryStatus, purpose, showTest })
    } else {
      scheduledResult = await getScheduledMessages({ page, state, channel, showTest })
    }
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
    />
  )
}
