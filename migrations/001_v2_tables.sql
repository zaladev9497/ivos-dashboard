-- ─── IVOS Dashboard v2 migration ─────────────────────────────────────────────
-- Review before applying. Run once against the idlewild-database project.
-- cadence_steps already exists — only dashboard_audit is new.

-- ─── dashboard_audit ──────────────────────────────────────────────────────────
-- Append-only log of every write made through the dashboard.
-- Never update or delete rows from this table.

CREATE TABLE IF NOT EXISTS dashboard_audit (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       text        NOT NULL,                 -- email of the user who made the change
  action      text        NOT NULL,                 -- e.g. 'template.save', 'journey.pause'
  table_name  text        NOT NULL,                 -- table that was written to
  row_id      text        NOT NULL,                 -- primary key of the affected row
  before      jsonb,                                -- snapshot before (null for inserts)
  after       jsonb,                                -- snapshot after
  note        text,                                 -- optional human note / approver name
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_audit_actor_idx       ON dashboard_audit (actor);
CREATE INDEX IF NOT EXISTS dashboard_audit_table_row_idx   ON dashboard_audit (table_name, row_id);
CREATE INDEX IF NOT EXISTS dashboard_audit_occurred_at_idx ON dashboard_audit (occurred_at DESC);

ALTER TABLE dashboard_audit ENABLE ROW LEVEL SECURITY;
