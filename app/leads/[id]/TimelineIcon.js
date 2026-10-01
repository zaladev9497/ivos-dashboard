/**
 * Timeline icons.
 *
 * These were text glyphs (◆ ✓ ✕ → ⏸) rendered in a mono font, which is the
 * single clearest tell of an unfinished interface: the shapes are inconsistent
 * in weight, they sit off the baseline, and they change between platforms.
 * Each is now a real 14px stroked icon on a tinted disc, so a timeline scans
 * as a column of aligned marks.
 *
 * `kind` is set by buildTimeline; `tone` picks the colour triple.
 */

const paths = {
  sent:      <path d="M20 6L9 17l-5-5" />,
  failed:    <path d="M18 6L6 18M6 6l12 12" />,
  outbound:  <path d="M5 12h13M12 5l7 7-7 7" />,
  inbound:   <path d="M19 12H6M12 19l-7-7 7-7" />,
  scheduled: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  paused:    <path d="M9.5 6.5v11M14.5 6.5v11" />,
  started:   <path d="M7 5.5l11 6.5-11 6.5z" />,
  note:      <><path d="M4 19.5V6a2 2 0 0 1 2-2h8l6 6v9.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M14 4v6h6" /></>,
  task:      <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></>,
  alert:     <><path d="M12 8.5v4.5M12 16.5v.01" /><circle cx="12" cy="12" r="8.5" /></>,
  order:     <><rect x="3.5" y="6" width="17" height="13" rx="2" /><path d="M3.5 10.5h17M8.5 6V3.5M15.5 6V3.5" /></>,
  signal:    <><circle cx="12" cy="12" r="3" /><path d="M6.5 17.5a7.8 7.8 0 0 1 0-11M17.5 6.5a7.8 7.8 0 0 1 0 11" /></>,
  dot:       <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />,
  event:     <path d="M12 4.5l7.5 7.5-7.5 7.5-7.5-7.5z" />,
}

export default function TimelineIcon({ kind = 'event', tone = 'neutral' }) {
  return (
    <span
      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: `var(--tone-${tone}-soft)`,
        border: `1px solid var(--tone-${tone}-rule)`,
        color: `var(--tone-${tone}-ink)`,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        {paths[kind] ?? paths.event}
      </svg>
    </span>
  )
}
