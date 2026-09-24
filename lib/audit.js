import { createServerClient } from './supabase'

export async function logAudit({ actor, action, tableName, rowId, before = null, after = null, note = null }) {
  try {
    const sb = createServerClient()
    await sb.from('dashboard_audit').insert({
      actor,
      action,
      table_name: tableName,
      row_id: String(rowId),
      before,
      after,
      note,
    })
  } catch {
    // dashboard_audit may not exist yet (pre-migration) — never fail the main write because of this
  }
}
