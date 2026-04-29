-- GreeceClean — Email notifications migration
-- Run in Supabase SQL editor AFTER schema.sql and seed.sql

-- ─────────────────────────────────────────
-- municipalities: add region column
-- ─────────────────────────────────────────
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS region text;

-- Add UNIQUE constraint on name_el so we can safely upsert by name
DO $$ BEGIN
  ALTER TABLE municipalities ADD CONSTRAINT municipalities_name_el_unique UNIQUE (name_el);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────
-- email_logs: audit trail for every sent (or failed) notification
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid        NOT NULL REFERENCES reports(id)         ON DELETE CASCADE,
  municipality_id uuid                 REFERENCES municipalities(id)  ON DELETE SET NULL,
  recipient_email text        NOT NULL,                        -- snapshot of address at send-time
  status          text        NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message   text,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_report        ON email_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_municipality  ON email_logs(municipality_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status        ON email_logs(status);

-- Service role only — no public read/write
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
-- (service_role bypasses RLS; no policies needed for an admin-only table)

COMMENT ON TABLE email_logs IS 'One row per notification attempt when a report is forwarded to a municipality';
