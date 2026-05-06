-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add German name column to municipalities
ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS name_de TEXT NOT NULL DEFAULT '';

-- Add geometry columns
ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS boundary geometry(MultiPolygon, 4326);

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Spatial index for boundary lookups
CREATE INDEX IF NOT EXISTS municipalities_boundary_gist
  ON municipalities USING GIST (boundary);

-- Spatial index for report points
CREATE INDEX IF NOT EXISTS reports_geom_gist
  ON reports USING GIST (geom);

-- Trigger: keep reports.geom in sync with lat/lng
CREATE OR REPLACE FUNCTION sync_report_geom()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_report_geom ON reports;
CREATE TRIGGER trg_sync_report_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON reports
  FOR EACH ROW EXECUTE FUNCTION sync_report_geom();

-- Backfill geom for existing rows
UPDATE reports
  SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND geom IS NULL;

-- Trigger: auto-assign municipality_id from boundary containment
-- Only fires when boundary data is present; leaves municipality_id unchanged
-- if no boundary matches (e.g. geocoder-assigned value is preserved).
CREATE OR REPLACE FUNCTION auto_assign_municipality()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  matched_id UUID;
BEGIN
  -- Only run if PostGIS geometry is available
  IF NEW.geom IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO matched_id
    FROM municipalities
    WHERE boundary IS NOT NULL
      AND ST_Contains(boundary::geometry, NEW.geom)
    LIMIT 1;

  IF matched_id IS NOT NULL THEN
    NEW.municipality_id := matched_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_municipality ON reports;
CREATE TRIGGER trg_auto_assign_municipality
  BEFORE INSERT OR UPDATE OF geom ON reports
  FOR EACH ROW EXECUTE FUNCTION auto_assign_municipality();
