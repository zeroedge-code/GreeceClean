-- GreeceClean Database Schema
-- Run in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- MUNICIPALITIES
-- ─────────────────────────────────────────
create table if not exists municipalities (
  id            uuid primary key default gen_random_uuid(),
  name_el       text not null,
  name_en       text not null default '',
  email_official text,
  created_at    timestamptz not null default now()
);

-- Add columns that may be missing from older installs
alter table municipalities add column if not exists name_en       text not null default '';
alter table municipalities add column if not exists email_official text;

comment on table municipalities is 'Greek municipalities that receive report notifications';

-- ─────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────
do $$ begin
  create type report_status as enum (
    'pending',
    'in_review',
    'forwarded',
    'resolved',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  public_token    text not null unique default encode(gen_random_bytes(6), 'hex'),
  image_url       text,
  lat             double precision not null,
  lng             double precision not null,
  category        text not null default 'other',
  status          report_status not null default 'pending',
  is_approved     boolean not null default false,
  municipality_id uuid references municipalities(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Drop legacy check constraint and upgrade status column to enum if needed
alter table reports drop constraint if exists reports_status_check;
do $$ begin
  alter table reports alter column status type report_status using status::report_status;
exception when others then null;
end $$;

-- Add columns that may be missing from older installs
alter table reports add column if not exists image_url       text;
alter table reports add column if not exists description     text;
alter table reports add column if not exists lat             double precision;
alter table reports add column if not exists lng             double precision;
alter table reports add column if not exists category        text not null default 'other';
alter table reports add column if not exists is_approved     boolean not null default false;
alter table reports add column if not exists municipality_id uuid references municipalities(id) on delete set null;
alter table reports add column if not exists updated_at      timestamptz not null default now();

comment on table reports is 'Citizen-submitted litter/dumping reports';
comment on column reports.public_token is 'Short token used in public tracking URL /r/<token>';

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_updated_at on reports;
create trigger reports_updated_at
  before update on reports
  for each row execute procedure update_updated_at();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table municipalities enable row level security;
alter table reports enable row level security;

-- Public: read approved reports only
drop policy if exists "Public can read approved reports" on reports;
create policy "Public can read approved reports"
  on reports for select
  using (is_approved = true);

-- Anon: insert new reports
drop policy if exists "Anyone can submit a report" on reports;
create policy "Anyone can submit a report"
  on reports for insert
  with check (true);

-- Service role: full access (for admin operations)
-- (service_role bypasses RLS by default in Supabase)

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
create index if not exists idx_reports_status       on reports(status);
create index if not exists idx_reports_municipality on reports(municipality_id);
create index if not exists idx_reports_public_token on reports(public_token);
create index if not exists idx_reports_location     on reports using gist (
  ll_to_earth(lat, lng)
);

-- ─────────────────────────────────────────
-- SAMPLE DATA (remove before production)
-- ─────────────────────────────────────────
insert into municipalities (name_el, name_en, email_official) values
  ('Δήμος Αθηναίων',     'Municipality of Athens',      'info@cityofathens.gr'),
  ('Δήμος Θεσσαλονίκης', 'Municipality of Thessaloniki', 'info@thessaloniki.gr'),
  ('Δήμος Ηρακλείου',    'Municipality of Heraklion',    'info@heraklion.gr'),
  ('Δήμος Πατρέων',      'Municipality of Patras',       'info@patras.gr');
