-- GreeceClean Seed Data
-- 17 real-based pollution incidents sourced from Greek news (2022-2025)
-- Sources: grtimes.gr, typosthes.gr, thesstoday.gr, zougla.gr, newshub.gr,
--          reader.gr, tvstar.gr, efsyn.gr, nassosblog.gr, ot.gr, dimokratiki.gr,
--          piraeus.gov.gr, chalandri.gr, nikaia-rentis.gov.gr, myvolos.net
-- Run in Supabase SQL editor AFTER schema.sql

-- ─────────────────────────────────────────
-- ADDITIONAL MUNICIPALITIES
-- ─────────────────────────────────────────
INSERT INTO municipalities (name_el, name_en, email_official)
SELECT v.name_el, v.name_en, v.email_official
FROM (VALUES
  ('Δήμος Καλαμαριάς',             'Municipality of Kalamaria',             'info@kalamaria.gr'),
  ('Δήμος Θέρμης',                 'Municipality of Thermi',                'info@thermi.gov.gr'),
  ('Δήμος Μάνδρας-Ειδυλλίας',     'Municipality of Mandra',                'info@mandra.gov.gr'),
  ('Δήμος Χαλκιδέων',             'Municipality of Chalkida',               'info@chalkida.gr'),
  ('Δήμος Σαρωνικού',             'Municipality of Saronikos',              'info@saronikos.gr'),
  ('Δήμος Μήλου',                 'Municipality of Milos',                  'info@milos.gr'),
  ('Δήμος Μυκονίων',              'Municipality of Mykonos',                'info@mykonos.gr'),
  ('Δήμος Θήρας',                 'Municipality of Thira (Santorini)',      'info@thira.gr'),
  ('Δήμος Ρόδου',                 'Municipality of Rhodes',                 'info@rhodes.gr'),
  ('Δήμος Κερκυραίων',            'Municipality of Corfu',                  'info@corfu.gr'),
  ('Δήμος Χαλανδρίου',            'Municipality of Chalandri',              'info@chalandri.gr'),
  ('Δήμος Πειραιά',               'Municipality of Piraeus',                'info@piraeus.gov.gr'),
  ('Δήμος Νίκαιας-Αγ.Ι. Ρέντη',  'Municipality of Nikaia-Ag.I.Rentis',    'info@nikaia-rentis.gov.gr'),
  ('Δήμος Βόλου',                 'Municipality of Volos',                  'info@volos.gov.gr')
) AS v(name_el, name_en, email_official)
WHERE NOT EXISTS (
  SELECT 1 FROM municipalities m WHERE m.name_el = v.name_el
);

-- ─────────────────────────────────────────
-- SEED REPORTS  (is_approved = true → visible on map)
-- ─────────────────────────────────────────

-- 1. Δυτική Θεσσαλονίκη – οδός Δάφνης, Λαχανόκηποι
--    Daily dumping of construction debris and household waste.
--    Source: grtimes.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'ab12cd34ef56',
  'https://picsum.photos/seed/10/800/600',
  40.6480, 22.9050,
  'illegal_dump', 'in_review', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Θεσσαλονίκης'),
  '2023-08-14 09:22:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 2. Καλαμαριά, Θεσσαλονίκη – Σύλληψη 60χρονου για παράνομη απόρριψη
--    Arrest for illegal dumping of bulky waste and construction materials.
--    Source: thesstoday.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  '12ab34cd56ef',
  'https://picsum.photos/seed/20/800/600',
  40.5748, 22.9642,
  'illegal_dump', 'forwarded', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Καλαμαριάς'),
  '2023-11-22 14:05:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 3. Θέρμη, Θεσσαλονίκη – Ανεξέλεγκτη χωματερή με ογκώδη αντικείμενα
--    Site turned into uncontrolled dump with bulky items and renovation waste.
--    Source: typosthes.gr (Cleaningans cleanup)
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'deadbeef1234',
  'https://picsum.photos/seed/30/800/600',
  40.5395, 23.0249,
  'illegal_dump', 'forwarded', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Θέρμης'),
  '2024-01-09 11:47:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 4. Μάνδρα, Αττική – Χωματερή δίπλα σε πευκόφυτο δάσος
--    Municipality-linked illegal dump established metres from pine forest.
--    Source: zougla.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'cafe1234abcd',
  'https://picsum.photos/seed/40/800/600',
  38.0713, 23.4994,
  'illegal_dump', 'resolved', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Μάνδρας-Ειδυλλίας'),
  '2022-06-30 08:15:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 5. Κοκκίνη Χάνι, Ηράκλειο – Μεγαλύτερη παράνομη χωματερή Κρήτης
--    75-stremma site active for 15+ years near Vrahokipos settlement.
--    Source: newshub.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'face987bcd12',
  'https://picsum.photos/seed/50/800/600',
  35.3490, 25.2231,
  'illegal_dump', 'in_review', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Ηρακλείου'),
  '2023-03-15 16:30:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 6. Χαλκίδα, Εύβοια – Τέσσερις συλλήψεις για παράνομη χωματερή
--    Four arrested in April 2024 for illegal dumping on private land.
--    Source: tvstar.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  '1234567890ab',
  'https://picsum.photos/seed/60/800/600',
  38.4631, 23.6034,
  'illegal_dump', 'in_review', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Χαλκιδέων'),
  '2024-04-08 10:00:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 7. Καλύβια, Αττική – Πόρισμα στη Δικαιοσύνη
--    Investigation findings sent to prosecutors over illegal landfill.
--    Source: efsyn.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'abcdef012345',
  'https://picsum.photos/seed/70/800/600',
  37.7697, 23.9071,
  'illegal_dump', 'forwarded', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Σαρωνικού'),
  '2022-09-20 13:55:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 8. Μήλος – 17 συλλήψεις για παράνομη χωματερή
--    17 people arrested for operating illegal dumping site on the island.
--    Source: nassosblog.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  '543210fedcba',
  'https://picsum.photos/seed/80/800/600',
  36.7271, 24.4350,
  'illegal_dump', 'resolved', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Μήλου'),
  '2023-07-12 07:40:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 9. Μύκονος – Σκουπίδια στο οδικό δίκτυο και ακτές
--    Litter on coastal roads; island lacks adequate waste infrastructure for 1.5M tourists.
--    Source: zougla.gr, euronews.com
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'a1b2c3d4e5f0',
  'https://picsum.photos/seed/90/800/600',
  37.4467, 25.3289,
  'roadside_litter', 'in_review', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Μυκονίων'),
  '2023-08-05 18:20:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 10. Σαντορίνη – Σκουπίδια με θέα θάλασσα
--     Beach and roadside litter documented in July 2023; 25 700 tonnes of annual waste.
--     Source: ot.gr (July 2023)
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  '0f1e2d3c4b5a',
  'https://picsum.photos/seed/100/800/600',
  36.3932, 25.4615,
  'roadside_litter', 'forwarded', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Θήρας'),
  '2023-07-05 17:05:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 11. Ρόδος – Παράνομη χωματερή, 90% ταφή απορριμμάτων
--     Rhodes produces 110 600 tonnes of waste/year; island buries 90% illegally.
--     Source: dimokratiki.gr (June 2024)
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  '123456abcdef',
  'https://picsum.photos/seed/110/800/600',
  36.4341, 28.2176,
  'illegal_dump', 'pending', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Ρόδου'),
  '2024-06-20 12:10:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 12. Κέρκυρα – Υπερχειλισμένοι κάδοι, ερώτηση στο Ευρωκοινοβούλιο
--     Overflowing bins and litter accumulation; formal complaint to European Parliament 2022.
--     Source: europarl.europa.eu (E-002123/2022)
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'fedcba654321',
  'https://picsum.photos/seed/120/800/600',
  39.6243, 19.9217,
  'roadside_litter', 'resolved', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Κερκυραίων'),
  '2022-08-11 09:00:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 13. Χαλάνδρι – Εγκαταλελειμμένα οχήματα οδός Σοφ. Βενιζέλου
--     Abandoned vehicles without plates on Sofokli Venizelou St; 620+ removed since 2015.
--     Source: myxalandri.gr, chalandri.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'a0b1c2d3e4f5',
  'https://picsum.photos/seed/130/800/600',
  38.0209, 23.7982,
  'abandoned_vehicle', 'resolved', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Χαλανδρίου'),
  '2024-02-14 11:30:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 14. Πειραιάς – Εκστρατεία απομάκρυνσης 490 οχημάτων
--     490 cars and 500 motorcycles removed in 2022 municipal campaign.
--     Source: piraeus.gov.gr (December 2022)
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'f5e4d3c2b1a0',
  'https://picsum.photos/seed/140/800/600',
  37.9453, 23.6462,
  'abandoned_vehicle', 'resolved', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Πειραιά'),
  '2022-12-05 10:45:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 15. Θεσσαλονίκη κέντρο – 573 εγκαταλελειμμένα οχήματα (2024)
--     573 vehicles flagged as abandoned in 2024 checks; 172 recycled to date.
--     Source: troxoikaitir.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  '9876543210ab',
  'https://picsum.photos/seed/150/800/600',
  40.6200, 22.9600,
  'abandoned_vehicle', 'forwarded', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Θεσσαλονίκης'),
  '2024-03-18 15:20:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 16. Νίκαια-Αγ.Ι. Ρέντη – Εγκαταλελειμμένα σε πεζοδρόμια και πλατείες
--     Ongoing removal operations across pavements, squares and public spaces.
--     Source: nikaia-rentis.gov.gr
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'ab9876543210',
  'https://picsum.photos/seed/160/800/600',
  37.9701, 23.6441,
  'abandoned_vehicle', 'in_review', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Νίκαιας-Αγ.Ι. Ρέντη'),
  '2023-10-03 08:55:00+03'
)
ON CONFLICT (public_token) DO NOTHING;

-- 17. Βόλος – Ερωτήματα για χωματερή κοντά στον Βιολογικό
--     Citizen questions raised over illegal dump near Volos wastewater treatment plant.
--     Source: myvolos.net
INSERT INTO reports (public_token, image_url, lat, lng, category, status, is_approved, municipality_id, created_at)
VALUES (
  'cc44dd55ee66',
  'https://picsum.photos/seed/170/800/600',
  39.3640, 22.9430,
  'illegal_dump', 'pending', true,
  (SELECT id FROM municipalities WHERE name_el = 'Δήμος Βόλου'),
  '2023-12-07 14:00:00+03'
)
ON CONFLICT (public_token) DO NOTHING;
