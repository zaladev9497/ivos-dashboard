'use client'
import { useState } from 'react'

/**
 * Tab switch for the lead record's main column. The children are rendered on
 * the server and handed in as slots, so switching tabs costs nothing — both
 * panels are already here, one is just hidden.
 */
export default function LeadTabs({ timeline, messages, messageCount = 0 }) {
  const [tab, setTab] = useState('timeline')

  const tabs = [
    { key: 'timeline', label: 'Timeline' },
    { key: 'messages', label: 'Messages', count: messageCount },
  ]

  return (
    <div className="space-y-4">
      <div className="segmented" role="tablist" aria-label="Lead record view">
        {tabs.map(t => (
          <button
            key={t.key}
            role="tab"
            id={`lead-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`lead-panel-${t.key}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {/* The track is already sunken paper, so the chip takes a plain
                outline rather than vanishing into it. */}
            {t.count > 0 && (
              <span className="counter" style={{ background: 'transparent' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="lead-panel-timeline"
        aria-labelledby="lead-tab-timeline"
        hidden={tab !== 'timeline'}
      >
        {timeline}
      </div>

      <div
        role="tabpanel"
        id="lead-panel-messages"
        aria-labelledby="lead-tab-messages"
        hidden={tab !== 'messages'}
      >
        {messages}
      </div>
    </div>
  )
}
