-- GreeceClean — Municipality email seed
-- Run AFTER email_notifications.sql (requires the UNIQUE constraint on name_el).
--
-- Column mapping vs. the prompt spec:
--   prompt `name`   → schema `name_el`
--   prompt `email`  → schema `email_official`
--
-- Strategy: INSERT … ON CONFLICT (name_el) DO UPDATE
--   → Safe to re-run; updates email/region even if row already exists.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO municipalities (name_el, name_en, email_official, region)
VALUES
  -- ── Confirmed addresses (sourced directly from municipal websites) ──────────
  ('Δήμος Μάνδρας-Ειδυλλίας',  'Municipality of Mandra-Eidyllias', 'info@mandras-eidyllias.gr',  'Αττική'),
  ('Δήμος Μήλου',               'Municipality of Milos',            'grammatia@milos.gr',         'Νότιο Αιγαίο'),
  ('Δήμος Κερκυραίων',          'Municipality of Corfu',            'info@corfu.gr',              'Ιόνια Νησιά'),
  ('Δήμος Θέρμης',              'Municipality of Thermi',           'info@thermi.gov.gr',         'Κεντρική Μακεδονία'),
  ('Δήμος Μυκονίων',            'Municipality of Mykonos',          'grammateia@mykonos.gr',      'Νότιο Αιγαίο'),

  -- ── Addresses from aftodioikisi.gr public directory — verify before first use ─
  ('Δήμος Πειραιά',             'Municipality of Piraeus',          'info@piraeus.gov.gr',        'Αττική'),
  ('Δήμος Χαλανδρίου',          'Municipality of Chalandri',        'info@halandri.gr',           'Αττική'),
  ('Δήμος Νίκαιας-Αγ.Ι. Ρέντη','Municipality of Nikaia-Ag.I.Rentis','info@nikaia-rentis.gov.gr', 'Αττική'),
  ('Δήμος Βόλου',               'Municipality of Volos',            'info@volos-city.gr',         'Θεσσαλία'),
  ('Δήμος Θήρας',               'Municipality of Thira',            'press@thira.gov.gr',         'Νότιο Αιγαίο'),
  ('Δήμος Καλαμαριάς',          'Municipality of Kalamaria',        'info@kalamaria.gr',          'Κεντρική Μακεδονία'),
  ('Δήμος Χαλκιδέων',           'Municipality of Chalkida',         'info@dimos-xalkideon.gr',    'Στερεά Ελλάδα'),
  ('Δήμος Σαρωνικού',           'Municipality of Saronikos',        'info@saronikoscity.gr',      'Αττική'),

  -- ── No public contact found yet — operator must verify before enabling ───────
  -- ('Δήμος Χαλκιδέων', 'contact@0932.syzefxis.gov.gr', 'Στερεά Ελλάδα'),

  -- ── Extra confirmed addresses for municipalities already in the DB ───────────
  ('Δήμος Αθηναίων',            'Municipality of Athens',           'info@cityofathens.gr',       'Αττική'),
  ('Δήμος Θεσσαλονίκης',        'Municipality of Thessaloniki',     'info@thessaloniki.gr',       'Κεντρική Μακεδονία'),
  ('Δήμος Ηρακλείου',           'Municipality of Heraklion',        'info@heraklion.gr',          'Κρήτη'),
  ('Δήμος Πατρέων',             'Municipality of Patras',           'info@patras.gr',             'Δυτική Ελλάδα')

ON CONFLICT (name_el)
DO UPDATE SET
  email_official = EXCLUDED.email_official,
  region         = EXCLUDED.region,
  name_en        = EXCLUDED.name_en;
