# IVOS Dashboard

Internal operations dashboard for Idlewild / Texas Shade. Shows what the n8n automations did for every lead, and lets the team manage templates, cadence timing, settings and exceptions.

## Stack

- Next.js 16 (App Router), JavaScript, Tailwind CSS 4
- Supabase (`@supabase/supabase-js`) — **server-side only**, using the service role key
- n8n automations write the data; this app reads it and edits a few control tables

> This Next.js version has breaking changes (e.g. `middleware` is now `proxy`, error pages receive `retry`).
> Read the guides in `node_modules/next/dist/docs/` before changing framework conventions.

## Pages

| Page | What it does |
|---|---|
| Leads | Searchable lead list; open a lead for the full timeline, scheduled messages and actions |
| Pipeline | Active journeys grouped by type and stage |
| Messages | Sent and scheduled messages, grouped by lead |
| Operations | Open exceptions, failed scheduled messages, business calendar, daily reports |
| Templates | Message templates (edit → new version → needs approval before it sends) |
| Cadence | Follow-up timing per journey step |
| Audit | Every change made through the dashboard |
| Settings | Business hours, test mode / SMS redirect, demo mode |

Light and dark themes (toggle in the sidebar); the sidebar collapses to icons.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Run `migrations/001_v2_tables.sql` once against the Supabase project (creates the append-only `dashboard_audit` table). The other tables are created and filled by the n8n automations.

### Environment variables

See [.env.example](.env.example). `AUTH_SECRET` is required in production; without it every request is sent to the login page.

## Production checklist

- [ ] All env vars set on the host; `AUTH_SECRET` is a long random value, `DASHBOARD_PASSWORD` is strong
- [ ] `DASHBOARD_ALLOWED_EMAILS` set so only named people can sign in
- [ ] Served over HTTPS (session cookie is `Secure` in production; HSTS header is sent)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only exists server-side (never prefixed `NEXT_PUBLIC_`)
- [ ] Uptime monitor pointed at `GET /api/health` (returns `{"status":"ok"}`, or 503 when the database is unreachable)
- [ ] `npm run build` passes and `npm run lint` is clean

## Security notes

- Every page and server action requires a valid session (`proxy.js` + `requireActor()`).
- Sign-in is rate limited (5 attempts per email and 10 per IP per 15 minutes, per server instance) and uses a constant-time password comparison. On serverless hosting the counters are per instance — put it behind a shared limiter if you need a hard guarantee.
- Settings writes use a strict field allowlist with value validation; template, cadence and journey actions validate input server-side.
- Responses carry `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and `noindex`.
- Every change made through the dashboard is written to `dashboard_audit`.
- Approving a template records the typed approver name and the signed-in email; there is one shared password, so the name is not independently verified.

## Operations notes

- **Test mode / demo mode banner** shows at the top whenever SMS are redirected or demo timings are on.
- **Demo "Advance"** calls `N8N_POLLER_RUN_URL`; it stops after 15 minutes or when the tab is hidden.
- Pages are rendered on demand (`force-dynamic`) so data is always current.

## Scripts

```bash
npm run dev     # development
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```
