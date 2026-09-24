# IVOS Dashboard

Read-only internal dashboard for Idlewild / Texas Shade. Shows everything the automations did for every lead — open one lead and see the full story.

## Stack

- Next.js 15 (App Router) — JavaScript, no TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`) — **server-side only**

## Setup

### 1. Prerequisites

- Node.js 18+
- npm

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Fill in `.env.local` (never commit this file):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key bypasses RLS. It is only ever used in server components and route handlers — it is never sent to the browser.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Leads list — searchable, filterable. Hides test records by default. |
| `/leads/[id]` | Lead detail — full timeline: events, messages, scheduled messages, exceptions, GlassHouse conversation. |
| `/pipeline` | Active journeys grouped by type and stage with age. |
| `/messages` | All sent/received messages and all scheduled messages with suppression reasons. |
| `/ops` | Open exceptions, failed scheduled messages, daily reports, business calendar, test-mode banner. |

## Important constraints

- **Read-only.** This dashboard performs no writes. The automations own the data.
- **No public Supabase queries.** RLS is enabled with no public policies. Every Supabase call uses `SUPABASE_SERVICE_ROLE_KEY` via server components or route handlers.
- **Do not add write paths in v1.** When v2 adds editing, keep mutations in clearly separate server actions or API routes so the read-only boundary stays visible.
- **Timestamps** are stored in UTC and displayed in `America/Chicago` with the timezone label shown.

## Project structure

```
app/
  page.js              # Leads list (server)
  LeadsTable.js        # Leads list (client — filters + pagination)
  leads/[id]/
    page.js            # Lead detail (server — fetches all related data)
    Timeline.js        # Unified timeline component (server)
    LeadSidebar.js     # Contact / journey / SMS state panel (server)
  pipeline/page.js     # Pipeline view (server)
  messages/
    page.js            # Messages (server)
    MessagesView.js    # Messages (client — tabs + filters)
  ops/page.js          # Operations (server)
lib/
  supabase.js          # createServerClient() — service role, server only
  queries.js           # All DB queries — import only in server components
  utils.js             # Formatting, colour helpers
components/
  Badge.js             # Status badge
  Timestamp.js         # Relative time with exact time on hover
  Pagination.js        # Page controls
  EmptyState.js        # Empty state placeholder
  Nav.js               # Top navigation (client — uses usePathname)
```
