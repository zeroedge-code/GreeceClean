# GreeceClean — Technical Documentation

**Version:** 1.0  
**Date:** May 2026  
**Stack:** Next.js 16 · React 19 · Supabase · Resend · Leaflet · Tailwind CSS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Local Development Setup](#4-local-development-setup)
5. [Project Structure](#5-project-structure)
6. [Database Schema](#6-database-schema)
7. [Environment Variables](#7-environment-variables)
8. [Authentication](#8-authentication)
9. [API Reference](#9-api-reference)
10. [Component Architecture](#10-component-architecture)
11. [Internationalisation (i18n)](#11-internationalisation-i18n)
12. [Report Lifecycle](#12-report-lifecycle)
13. [Image Processing Pipeline](#13-image-processing-pipeline)
14. [Location & Geocoding Pipeline](#14-location--geocoding-pipeline)
15. [Email Notification System](#15-email-notification-system)
16. [Admin Workflow](#16-admin-workflow)
17. [Stub Mode (Demo without Supabase)](#17-stub-mode-demo-without-supabase)
18. [Styling System](#18-styling-system)
19. [Known Limitations & Future Work](#19-known-limitations--future-work)
20. [How to Extend the Project](#20-how-to-extend-the-project)
21. [Category & Priority System](#21-category--priority-system)

---

## 1. Project Overview

GreeceClean is a citizen-facing web application that allows anyone to photograph and report environmental violations — illegal dumping, roadside litter, abandoned vehicles, vandalism — and automatically routes those reports to the responsible Greek municipality for action.

**Core user journey:**

```
Citizen photographs a problem
  → Uploads photo + confirms location on map
  → Receives a personal tracking URL (/r/<token>)
  → Admin reviews the report in the dashboard
  → Admin forwards to the municipality (automated email)
  → Municipality acts; admin marks resolved
  → Citizen sees progress on their tracking page
```

**The platform has three audiences:**

| Audience | Entry point | Auth |
| --- | --- | --- |
| Citizens | `/`, `/report`, `/map`, `/r/[token]` | None — fully public |
| Administrators | `/admin/dashboard`, `/admin/municipalities` | Password cookie |
| Municipalities | Receive email notifications only | Not a system user |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel (Edge)                        │
│                                                             │
│  middleware.ts  ──── guards /admin/* and /api/admin/*       │
│                                                             │
│  Next.js App Router                                         │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │   Server Components  │  │      API Routes (Node.js)    │ │
│  │  app/(public)/       │  │  /api/report          POST   │ │
│  │  app/admin/          │  │  /api/admin/report/[id] PATCH│ │
│  │                      │  │  /api/admin/municipalities   │ │
│  │  — fetch from DB     │  │  /api/admin/login    POST    │ │
│  │  — render HTML       │  │  /api/admin/logout   POST    │ │
│  └──────────────────────┘  │  /api/locale         POST    │ │
│                             └──────────────────────────────┘ │
│  Client Components (React 19, browser-only)                 │
│  ReportForm · LocationPicker · MapClient · AdminReportList  │
└───────────────┬─────────────────────┬───────────────────────┘
                │                     │
      ┌─────────▼──────────┐  ┌───────▼────────┐
      │   Supabase          │  │   Resend        │
      │  PostgreSQL (DB)    │  │  Email API      │
      │  Storage (images)   │  └────────────────┘
      │  Row Level Security │
      └────────────────────┘
                │
      ┌─────────▼──────────┐
      │  Nominatim (OSM)   │
      │  Reverse geocoding │
      └────────────────────┘
```

**Key architectural decisions:**

- **No client-side DB access for mutations.** All writes go through Next.js API routes using the `supabaseAdmin` client (service role). The browser-facing `supabase` client (anon key) is used only for public reads.
- **Server Components for all pages.** Pages fetch data server-side at request time (`force-dynamic`). No client-side data fetching on page load — React only takes over for interactive widgets.
- **Middleware at the edge.** `middleware.ts` validates the admin session cookie before Next.js even renders the route, so no server component or API route needs to repeat auth logic.
- **Stub mode.** The entire app runs without Supabase configured, using in-memory seed data. This enables local development with zero external dependencies.

---

## 3. Tech Stack

| Layer | Technology | Version | Purpose |
| --- | --- | --- | --- |
| Framework | Next.js | ^16.2 | App Router, API routes, middleware |
| UI | React | ^19.0 | Component model |
| Language | TypeScript | ^5 | Strict mode enabled |
| Styling | Tailwind CSS | ^3.4 | Utility-first CSS |
| Database | Supabase (PostgreSQL) | ^2.47 JS client | Reports, municipalities, email logs |
| Storage | Supabase Storage | — | WebP report images |
| Email | Resend | ^6.12 | Municipality notification emails |
| Maps | Leaflet | ^1.9 | Interactive map picker + public map |
| Image processing | sharp | ^0.33 | Server-side WebP compression |
| EXIF parsing | exifr | ^7.1 | GPS coordinate extraction from photos |
| Geocoding | Nominatim (OpenStreetMap) | — | Reverse geocode lat/lng → municipality name |

---

## 4. Local Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- (Optional) A Supabase project for full functionality — the app runs in stub mode without one

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd GreeceClean
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local — minimum required for stub mode: none
# For full Supabase mode: fill in the 3 SUPABASE_* variables

# 3. Start the development server
npm run dev
# → http://localhost:3000
```

### Environment for local development

To run with Supabase locally, the minimum `.env.local` is:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=any-password-for-dev
ADMIN_COOKIE_SECRET=any-secret-for-dev-min-32-chars
```

`RESEND_API_KEY` and `EMAIL_FROM` are only needed if you want to test email forwarding locally.

### Running without Supabase (stub mode)

Simply omit all `SUPABASE_*` variables from `.env.local`. The app uses `lib/seed-data.ts` (17 sample reports) for the map and tracking page. Report submission returns a fake token. Admin routes return `503 Supabase not configured`.

---

## 5. Project Structure

```
GreeceClean/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: Inter font, LocaleProvider, Header
│   ├── globals.css               # Tailwind base + .btn-primary, .btn-action, .card
│   │
│   ├── (public)/                 # Public route group (no layout override)
│   │   ├── page.tsx              # Landing page — hero, stats, leaderboard
│   │   ├── report/page.tsx       # Report submission wrapper
│   │   ├── map/page.tsx          # Public Leaflet map
│   │   └── r/[token]/page.tsx    # Citizen tracking page
│   │
│   ├── admin/                    # Protected admin area
│   │   ├── login/page.tsx        # Password login form
│   │   ├── dashboard/page.tsx    # Report review (pending / approved / rejected)
│   │   └── municipalities/page.tsx # Municipality email management
│   │
│   └── api/                      # API routes (Node.js runtime)
│       ├── report/route.ts       # POST — public report submission
│       ├── locale/route.ts       # POST — language preference cookie
│       └── admin/
│           ├── login/route.ts    # POST — admin authentication
│           ├── logout/route.ts   # POST — session termination
│           ├── report/[id]/route.ts        # PATCH + DELETE — report management
│           └── municipalities/[id]/route.ts # PATCH — municipality email
│
├── components/                   # React components
│   ├── Header.tsx                # Sticky nav with mobile menu + language switcher
│   ├── ReportForm.tsx            # Multi-step report form (client)
│   ├── LocationPicker.tsx        # Leaflet map picker with GPS + Nominatim search (client)
│   ├── MapClient.tsx             # Public read-only report map (client)
│   ├── MapWrapper.tsx            # dynamic() SSR wrapper for MapClient
│   ├── LocaleProvider.tsx        # React context: locale + full Dictionary
│   ├── LanguageSwitcher.tsx      # Flag buttons → POST /api/locale → router.refresh()
│   ├── AdminReportList.tsx       # Admin report table with inline edit (client)
│   ├── MunicipalityEmailList.tsx # Admin municipality email table (client)
│   ├── CategoryBadge.tsx         # Shared server+client: emoji in pastel circle + label
│   └── CopyButton.tsx            # Clipboard copy with i18n feedback
│
├── lib/                          # Shared server-side utilities
│   ├── supabase.ts               # Two Supabase clients: anon (RLS) + admin (service role)
│   ├── categories.ts             # VALID_CATEGORIES + CATEGORY_META — single source of truth
│   ├── priority.ts               # calculateReportPriority() + PRIORITY_LABELS
│   ├── geocoding.ts              # reverseGeocode(lat, lng) → municipalityName via Nominatim
│   ├── email.ts                  # sendEmail() wrapper around Resend SDK
│   ├── emailTemplates.ts         # buildMunicipalityReportEmail() → { subject, html }
│   ├── notifications.ts          # (legacy stub — superseded by emailTemplates.ts)
│   ├── seed-data.ts              # 17 sample reports for stub/demo mode
│   └── i18n/
│       ├── types.ts              # Locale type + full Dictionary type definition
│       ├── index.ts              # getDictionary(locale) + getLocale() (reads cookie)
│       ├── el.ts                 # Greek translations
│       ├── en.ts                 # English translations
│       └── de.ts                 # German translations
│
├── supabase/                     # Database migrations (run in order)
│   ├── schema.sql                # Tables, RLS policies, indexes, triggers
│   ├── email_notifications.sql   # email_logs table + UNIQUE constraint on municipalities
│   ├── seed_municipalities.sql   # Real Greek municipality list with confirmed emails
│   ├── migrations/
│   │   └── 001_postgis_geometry.sql  # PostGIS extension, geometry columns, spatial indexes & triggers
│   └── seed.sql                  # Sample data (development only)
│
├── middleware.ts                 # Edge middleware — guards all /admin/* routes
├── proxy.ts                      # (Legacy — superseded by middleware.ts, safe to delete)
├── next.config.ts                # sharp as external package; Supabase image domain
├── tailwind.config.ts            # Custom colours: primary (#005BAE), action (#6B8E23)
├── tsconfig.json                 # strict: true; path alias @/* → ./*
└── .env.local.example            # Environment variable template
```

---

## 6. Database Schema

### Tables

#### `municipalities`

Stores every Greek municipality. Populated from `seed_municipalities.sql`.

| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | Primary key, `gen_random_uuid()` |
| `name_el` | `text` | NO | Greek name — UNIQUE constraint (used for upsert by Nominatim name) |
| `name_en` | `text` | NO | English name (defaults to empty string) |
| `name_de` | `text` | YES | German name (added by PostGIS migration) |
| `email_official` | `text` | YES | Destination for forwarded report emails |
| `region` | `text` | YES | Greek regional unit name (e.g. Αττική) |
| `boundary` | `geometry(MultiPolygon, 4326)` | YES | GeoJSON boundary polygon for spatial auto-assignment |
| `created_at` | `timestamptz` | NO | Auto-set on insert |

**RLS:**


- Public: `SELECT` allowed (municipality names are public data)
- Anon: no `INSERT`, `UPDATE`, or `DELETE`
- Service role: full access

#### `reports`

One row per submitted report.

| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | Internal primary key |
| `public_token` | `text` | NO | UNIQUE — 12-char hex used in `/r/<token>` URL |
| `image_url` | `text` | YES | Primary image URL — kept for backward compatibility |
| `image_urls` | `jsonb` | YES | Array of all image URLs (up to 3): `["...webp", "..._2.webp", "..._3.webp"]` |
| `lat` | `double precision` | NO | Latitude |
| `lng` | `double precision` | NO | Longitude |
| `geom` | `geometry(Point, 4326)` | YES | PostGIS point synced from lat/lng by trigger |
| `category` | `text` | NO | Enum value — see [Report Categories](#report-categories) |
| `status` | `report_status` | NO | Lifecycle state — see [Report Lifecycle](#12-report-lifecycle) |
| `is_approved` | `boolean` | NO | Controls public visibility on map and tracking page |
| `municipality_id` | `uuid` | YES | FK → `municipalities.id`, `ON DELETE SET NULL` — auto-set by spatial trigger when boundary data is loaded |
| `description` | `text` | YES | Optional citizen note, max 500 chars |
| `created_at` | `timestamptz` | NO | Submission timestamp |
| `updated_at` | `timestamptz` | NO | Auto-updated by trigger on every `UPDATE` |

**`report_status` enum values:** `pending`, `in_review`, `forwarded`, `resolved`, `rejected`

**RLS:**

- Public: `SELECT WHERE is_approved = true`
- Anon: `INSERT` with no restriction (`WITH CHECK (true)`) — rate limiting is at the API level via honeypot
- Service role: full access

#### `email_logs`

Audit trail for every email notification attempt.

| Column | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | Primary key |
| `report_id` | `uuid` | NO | FK → `reports.id`, `ON DELETE CASCADE` |
| `municipality_id` | `uuid` | YES | FK → `municipalities.id`, `ON DELETE SET NULL` |
| `recipient_email` | `text` | NO | Snapshot of the address at send time |
| `status` | `text` | NO | `'sent'` or `'failed'` |
| `error_message` | `text` | YES | Resend error if `status = 'failed'` |
| `sent_at` | `timestamptz` | NO | Auto-set on insert |

**RLS:** Enabled with no public policies — only service role can read/write.

### Triggers

| Trigger | Table | When | Effect |
| --- | --- | --- | --- |
| `reports_updated_at` | `reports` | `BEFORE UPDATE` | Sets `updated_at = now()` on every row change |
| `trg_sync_report_geom` | `reports` | `BEFORE INSERT OR UPDATE OF lat, lng` | Sets `geom = ST_MakePoint(lng, lat)` |
| `trg_auto_assign_municipality` | `reports` | `BEFORE INSERT OR UPDATE OF geom` | Finds containing `municipalities.boundary` via `ST_Within`; sets `municipality_id` (only fires when boundary data is loaded) |

### Indexes

| Index | Table | Column(s) | Type |
| --- | --- | --- | --- |
| `idx_reports_status` | `reports` | `status` | B-tree |
| `idx_reports_municipality` | `reports` | `municipality_id` | B-tree |
| `idx_reports_public_token` | `reports` | `public_token` | B-tree |
| `idx_reports_location` | `reports` | `ll_to_earth(lat, lng)` | GiST |
| `municipalities_boundary_gist` | `municipalities` | `boundary` | GiST |
| `reports_geom_gist` | `reports` | `geom` | GiST |
| `idx_email_logs_report` | `email_logs` | `report_id` | B-tree |
| `idx_email_logs_municipality` | `email_logs` | `municipality_id` | B-tree |
| `idx_email_logs_status` | `email_logs` | `status` | B-tree |

### PostGIS Spatial Columns

Added by `supabase/migrations/001_postgis_geometry.sql`:

- `CREATE EXTENSION IF NOT EXISTS postgis` — enabled at the database level
- `municipalities.boundary geometry(MultiPolygon, 4326)` — loaded from GeoJSON boundary data; used for spatial auto-assignment
- `reports.geom geometry(Point, 4326)` — maintained automatically by `trg_sync_report_geom`

When boundary data is loaded into `municipalities`, the `trg_auto_assign_municipality` trigger automatically resolves `municipality_id` for all new and updated reports without any application-level geocoding. A backfill `UPDATE reports SET geom = ST_MakePoint(lng, lat)` is included in the migration to sync existing rows.

### Report Categories

Valid entries for `reports.category` are defined in `lib/categories.ts → VALID_CATEGORIES`. API routes import from there — no hardcoded lists in route files. All 11 form categories plus `other` are submittable; `vandalism` is a legacy display-only value.

| Value | Greek label | Form? |
| --- | --- | --- |
| `illegal_dump` | Παράνομη Χωματερή | Yes |
| `construction_debris` | Μπάζα Κατασκευών | Yes |
| `roadside_litter` | Σκουπίδια στο Δρόμο | Yes |
| `plastics` | Πλαστικά | Yes |
| `tires` | Ελαστικά | Yes |
| `appliances` | Ηλεκτρικές Συσκευές | Yes |
| `abandoned_vehicle` | Εγκαταλελειμμένο Όχημα | Yes |
| `green_waste` | Πράσινα Απόβλητα | Yes |
| `bulky_items` | Ογκώδη Αντικείμενα | Yes |
| `coastal_pollution` | Θαλάσσια Ρύπανση | Yes |
| `sewage` | Λύματα | Yes |
| `other` | Άλλο | Yes |
| `vandalism` | Βανδαλισμός | No (legacy display only) |

---

## 7. Environment Variables

All variables are read at runtime on the server. None of the server-only variables are accessible in browser bundles.

| Variable | Client? | Required | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL. `NEXT_PUBLIC_` prefix makes it available in browser code. Safe to expose — no auth capability. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase anonymous key. Safe to expose — RLS enforces all access rules. |
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Yes | Bypasses RLS. **Never** prefix with `NEXT_PUBLIC_`. Used only inside API routes. |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Full origin URL (e.g. `https://greececlean.gr`). Used to construct tracking URLs that are stored in the database and sent in emails. Set this before any real reports are submitted. |
| `ADMIN_PASSWORD` | **No** | Yes | Single admin credential. Min 20 random characters in production. |
| `ADMIN_COOKIE_SECRET` | **No** | Yes | HMAC signing key for the session cookie. Min 32 random characters. Must be different from `ADMIN_PASSWORD`. |
| `RESEND_API_KEY` | **No** | For email | Resend API key beginning with `re_`. Only required when forwarding reports to municipalities. |
| `EMAIL_FROM` | **No** | For email | Sender address in RFC 5322 format: `GreeceClean <noreply@greececlean.gr>`. The domain must be verified in Resend. |

**`isSupabaseConfigured` flag** — `lib/supabase.ts` exports this boolean, which is `true` only when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Every data-fetching function in the app guards with this flag before attempting DB queries. If it is `false`, the app enters stub mode (see [Section 17](#17-stub-mode-demo-without-supabase)).

---

## 8. Authentication

The admin area uses a custom **HMAC-SHA256 cookie** scheme. There are no user accounts in the database — a single shared password is configured via `ADMIN_PASSWORD`.

### Login flow

```
POST /api/admin/login  { password: "..." }
  ↓
Compare against process.env.ADMIN_PASSWORD
  ↓ match
Compute: HMAC-SHA256(ADMIN_PASSWORD, ADMIN_COOKIE_SECRET)  →  token
Set-Cookie: admin_session=<token>; HttpOnly; SameSite=Lax; Max-Age=28800
Redirect → /admin/dashboard
```

### Session validation (middleware.ts)

Every request to `/admin/*` and `/api/admin/*` (except the login/logout routes) passes through `middleware.ts`:

```typescript
const expected = createHmac('sha256', ADMIN_COOKIE_SECRET)
                   .update(ADMIN_PASSWORD)
                   .digest('hex')

return cookieValue === expected  // constant-time compare not used — improve if needed
```

The cookie value is deterministic for a given `ADMIN_PASSWORD` + `ADMIN_COOKIE_SECRET` pair. To invalidate all sessions instantly, rotate either variable in Vercel and redeploy.

### Session properties

- **Duration:** 8 hours (`Max-Age: 28800`)
- **Scope:** HttpOnly (not accessible from JavaScript), SameSite=Lax
- **Cookie name:** `admin_session`

### Logout

`POST /api/admin/logout` clears the cookie with `Max-Age: 0` and redirects to `/admin/login`.

---

## 9. API Reference

All API routes are in `app/api/`. They run in the **Node.js runtime** (not Edge) because `sharp` requires native binaries.

---

### `POST /api/report`

Public endpoint. Accepts a report submission.

**Request:** `multipart/form-data`

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `image` | File | Yes | Max 10 MB. Any image format accepted by sharp. Primary photo. |
| `image2` | File | No | Max 10 MB. Second photo (optional). |
| `image3` | File | No | Max 10 MB. Third photo (optional). |
| `lat` | string (float) | Yes | Must be a valid float |
| `lng` | string (float) | Yes | Must be a valid float |
| `category` | string | Yes | One of the values in `VALID_CATEGORIES` (`lib/categories.ts`) |
| `description` | string | No | Truncated to 500 chars server-side |
| `hp_field` | string | Yes | Honeypot — must be empty string |

**Processing sequence:**

1. Parse FormData (400 on failure)
2. Check honeypot — if non-empty, return fake success immediately (no DB write)
3. Validate all fields — 400/413/422 on failure
4. Compress all provided images to WebP ≤ 500 KB in parallel (422 if any image is incompressible)
5. Generate `public_token` (12-char hex from `crypto.randomUUID()`)
6. Reverse-geocode coordinates via Nominatim
7. Check `isSupabaseConfigured` — if false, return stub response
8. In parallel: upload all WebP buffers to Supabase Storage + resolve municipality ID from name
   - Primary: `<token>.webp`, second: `<token>_2.webp`, third: `<token>_3.webp`
9. Insert report row with `status='pending'`, `is_approved=false`, `image_url` = primary URL, `image_urls` = JSONB array of all URLs
10. Return `{ token, trackingUrl }`

**Response — success:**

```json
{ "token": "a1b2c3d4e5f6", "trackingUrl": "https://greececlean.gr/r/a1b2c3d4e5f6" }
```

**Response — stub mode:**

```json
{ "token": "...", "trackingUrl": "...", "_stub": true }
```

**Error responses:**

| Status | Body | Condition |
| --- | --- | --- |
| 400 | `{ "error": "Invalid request body" }` | Malformed multipart |
| 400 | `{ "error": "Missing required fields" }` | Missing image, lat, lng, or category |
| 413 | `{ "error": "Image too large (max 10 MB)" }` | Any image file > 10 MB |
| 422 | `{ "error": "Invalid category" }` | Category not in `VALID_CATEGORIES` |
| 422 | `{ "error": "Image cannot be compressed below 500 KB" }` | Incompressible image |
| 500 | `{ "error": "Storage error" }` | Supabase Storage upload failure |
| 500 | `{ "error": "Database error" }` | Supabase INSERT failure |

---

### `PATCH /api/admin/report/[id]`

Protected. Performs a state transition or inline edit on a report. Body is JSON.

**Actions:**

| `action` | Effect on DB | Use case |
| --- | --- | --- |
| `approve` | `is_approved=true, status='in_review'` | Admin verifies report is genuine |
| `reject` | `is_approved=false, status='rejected'` | Spam, duplicate, or invalid |
| `mark_cleaned` | `status='resolved'` | Problem confirmed cleaned up |
| `deactivate` | `is_approved=false, status='pending'` | Return approved report to the queue |
| `forward` | `status='forwarded'` + sends email | Notify municipality; logs to `email_logs` |
| `edit` | Updates `category`, `status`, `municipality_id`, `description` | Inline correction |

**Forward response — email failure (207 Multi-Status):**

```json
{
  "ok": true,
  "warning": "Το status άλλαξε σε \"forwarded\" αλλά το email απέτυχε: ..."
}
```

The status is updated even if the email fails; the failure is logged to `email_logs`.

---

### `DELETE /api/admin/report/[id]`

Protected. Deletes the report and its image from Supabase Storage.

The image file is identified as `<public_token>.webp` in the `reports` storage bucket.

---

### `PATCH /api/admin/municipalities/[id]`

Protected. Updates a municipality's contact information.

**Accepted fields:** `email_official` (validated email format or empty string to clear), `region` (free text), `name_en` (free text).

---

### `POST /api/admin/login`

Unprotected (excluded from middleware matcher). Validates the submitted `password` against `ADMIN_PASSWORD`, sets the session cookie, and redirects to the dashboard.

---

### `POST /api/admin/logout`

Unprotected. Clears the session cookie and redirects to login.

---

### `POST /api/locale`

Unprotected. Sets the `locale` cookie (1-year expiry, not HttpOnly so client JS can read it).

**Body:** `{ "locale": "el" | "en" | "de" }`

---

## 10. Component Architecture

### Server Components (no `'use client'`)

These components run only on the server and produce static HTML. They can call `async` functions, read cookies, and query the database directly.

| Component / Page | Data source |
| --- | --- |
| `app/(public)/page.tsx` | `supabaseAdmin` — stats + leaderboard |
| `app/(public)/r/[token]/page.tsx` | `supabaseAdmin` — single report by token |
| `app/(public)/map/page.tsx` | `supabase` (anon) — approved reports |
| `app/admin/dashboard/page.tsx` | `supabaseAdmin` — all pending/approved/rejected |
| `app/admin/municipalities/page.tsx` | `supabaseAdmin` — all municipalities |
| `app/layout.tsx` | `getLocale()` cookie read |
| `components/CategoryBadge.tsx` | Props only — no data fetching; reads `CATEGORY_META` from `lib/categories.ts` |

### Client Components (`'use client'`)

These run in the browser and handle interactivity. They receive all data as props from their server-component parents.

| Component | Responsibility |
| --- | --- |
| `ReportForm` | Multi-step form state, EXIF parsing, camera, submit |
| `LocationPicker` | Leaflet map init, GPS, Nominatim search, marker drag |
| `MapClient` | Read-only Leaflet map for public report display |
| `MapWrapper` | `dynamic(() => import('./MapClient'), { ssr: false })` wrapper — prevents Leaflet from running on the server |
| `AdminReportList` | Report table with inline edit, status actions, forward |
| `MunicipalityEmailList` | Municipality table with inline email edit |
| `Header` | Mobile menu toggle, reads `t` from `LocaleProvider` context |
| `LanguageSwitcher` | Posts locale to `/api/locale`, calls `router.refresh()` |
| `CopyButton` | Clipboard write with copied/not-copied state |

### Context

`LocaleProvider` (in `app/layout.tsx`) wraps the entire component tree. It provides `{ locale, t }` — the active locale string and the full `Dictionary` object — to every client component via `useLocale()`.

```typescript
// In any client component:
const { locale, t } = useLocale()
```

### Leaflet and SSR

Leaflet directly accesses `window` and `document` on import, which crashes Next.js server-side rendering. The solution used throughout the project:

- `MapWrapper.tsx` uses `dynamic(() => import('./MapClient'), { ssr: false })`
- `LocationPicker` is loaded via `dynamic(() => import('./LocationPicker'), { ssr: false })` inside `ReportForm`
- The `MARKER_ICON` and `markerIcon` constants are defined at module level — this is safe because these modules are never executed server-side

---

## 11. Internationalisation (i18n)

### Supported languages

| Locale | Language | Flag |
| --- | --- | --- |
| `el` (default) | Greek | 🇬🇷 |
| `en` | English | 🇬🇧 |
| `de` | German | 🇩🇪 |

### How locale is determined

1. On every server request, `lib/i18n/index.ts → getLocale()` reads the `locale` cookie
2. If the cookie is missing or invalid, it falls back to `'el'`
3. The locale is passed to `LocaleProvider` in `app/layout.tsx`, making it available to all client components
4. The `<html lang={locale}>` attribute is set server-side

### Changing language

The user clicks a flag in `LanguageSwitcher`:

1. `POST /api/locale` with `{ locale: "en" }` sets the cookie (1-year, not HttpOnly)
2. `router.refresh()` triggers a full server re-render with the new locale
3. All text on the page updates without a full navigation

### Dictionary structure (`lib/i18n/types.ts`)

```typescript
type Dictionary = {
  nav:      { home, map, report }
  landing:  { heroTitle, heroHighlight, heroDesc, ctaPrimary, ctaSecondary,
              whatToReport, reportTypes[11], howItWorksTitle, howSteps[],
              statsReports, statsCleaned, statsMunicipalities,
              impactTitle, impactSubtitle, championsTitle, championsSubtitle,
              needsWorkTitle, needsWorkSubtitle, unresolvedLabel, footerTagline }
  tracking: { pageTitle, notFoundTitle, notFoundDesc, labelCategory,
              labelMunicipality, labelSubmitted, labelDescription,
              rejectedMsg, progressTitle, steps[4], shareTitle,
              whatsappTemplate,
              categories: Record<string, string>  // 13 entries incl. legacy vandalism
            }
  copy:     { copy, copied }
  form:     { pageTitle, pageSubtitle, photoTitle, photoDesc, photosMultiDesc,
              photoButton, photoLibrary, photoHint, photoRemove,
              locationTitle, locationDesc, locationFound, locationRetry,
              locationLoading, locationButton, locationError,
              locationExifScanning, locationExifNotFound,
              locationExifOutsideGreece, locationAdjustHint,
              locationConfirmTitle, locationSearchPlaceholder,
              categoryTitle, categoryDesc,
              descLabel, descOptional, descPlaceholder, navNext, navBack,
              submitTitle, submit, submitting, submitSkip,
              successTitle,   // "Thank you for making Greece cleaner! 🌿"
              successDesc,    // includes team verification + map appearance note
              successLinkLabel, successMapLink, successAnother,
              categories[12],              // 11 types + other; no vandalism
              categoryLabels: Record<string, string>  // 13 entries incl. legacy vandalism
            }
  map:      { unknownMunicipality, viewReport }
}
```

### Adding a new language

1. Create `lib/i18n/xx.ts` implementing the full `Dictionary` type
2. Add `'xx'` to the `LOCALES` array in `lib/i18n/types.ts`
3. Import and add `xx` to `dicts` in both `lib/i18n/index.ts` and `components/LocaleProvider.tsx`
4. Add the flag button to `LANGS` in `components/LanguageSwitcher.tsx`

### Admin area

The admin area is intentionally not internationalised — all labels are hardcoded in Greek. The admin is an internal tool used by Greek-speaking staff.

---

## 12. Report Lifecycle

```text
                    [citizen submits]
                          │
                          ▼
                       pending
                    is_approved: false
                          │
          ┌───────────────┼───────────────┐
          │               │               │
       approve         reject        mark_cleaned
          │               │               │
          ▼               ▼               ▼
       in_review       rejected        resolved
    is_approved: true               is_approved: false
          │
       forward
    (sends email)
          │
          ▼
       forwarded
          │
       mark_cleaned
          │
          ▼
        resolved
```

**Visibility rules:**

- A report appears on the **public map** only when `is_approved = true`
- The **tracking page** (`/r/[token]`) is always accessible by token, regardless of `is_approved`
- The **progress stepper** on the tracking page shows step completion based on `status`:

| Step | Label | Done when `status` is... |
| --- | --- | --- |
| 1 | Submitted | Always done |
| 2 | Verified | `in_review`, `forwarded`, `resolved` |
| 3 | Municipality Notified | `forwarded`, `resolved` |
| 4 | Cleaned Up | `resolved` |

---

## 13. Image Processing Pipeline

All image processing happens server-side in `/api/report/route.ts` using **sharp**. Up to 3 images are accepted; all are compressed in parallel.

**Per-image compression (applied to each uploaded file independently):**

```text
Browser uploads any image format (JPEG, PNG, HEIC, WebP, …)
  ↓
Read into Buffer via arrayBuffer()
  ↓
Attempt 1: resize to max width 1920px, WebP quality 80
  ↓ if > 500 KB
Attempt 2: resize to max width 1200px, WebP quality 65
  ↓ if > 500 KB
Attempt 3: resize to max width 900px, WebP quality 50
  ↓ if still > 500 KB
Throw — "Image cannot be compressed below 500 KB"
```

**Parallel processing and upload:**

```text
[image1 compress]  [image2 compress]  [image3 compress]
       ↓                  ↓                  ↓
  Promise.all() — all three run concurrently
       ↓
Upload results to Supabase Storage:
  <token>.webp        ← primary (image)
  <token>_2.webp      ← second  (image2, if provided)
  <token>_3.webp      ← third   (image3, if provided)
```

**Storage paths:**

| File | Storage path |
| --- | --- |
| Primary | `reports/<token>.webp` |
| Second | `reports/<token>_2.webp` |
| Third | `reports/<token>_3.webp` |

**Database storage:**

- `reports.image_url` — set to the primary image URL (backward compatibility)
- `reports.image_urls` — JSONB array of all image URLs, e.g. `["...webp", "..._2.webp"]`

The tracking page reads `image_urls` (falling back to `image_url`) and renders a horizontal-scroll gallery when multiple photos are present.

**Public URL pattern:** `https://<ref>.supabase.co/storage/v1/object/public/reports/<token>.webp`

The `next.config.ts` whitelists `*.supabase.co` for this pattern. `sharp` is declared as a `serverExternalPackage` in `next.config.ts`, which prevents Next.js from trying to bundle it (it uses native C++ binaries that cannot be bundled).

---

## 14. Location & Geocoding Pipeline

### EXIF GPS extraction (client-side)

When a user uploads a photo, `exifr.gps(file)` runs in the browser:

```typescript
const result = await exifr.gps(file)
// → { latitude: 37.97, longitude: 23.73 } or null
```

If coordinates are found and fall within the Greek bounding box (34.8–41.8 lat, 19.3–29.7 lng), they are pre-filled into the map picker as the initial marker position.

If GPS data exists but is outside Greece (e.g. a photo taken abroad), the amber banner "GPS found outside Greece — please select on the map" is shown.

### Map picker (client-side, `LocationPicker.tsx`)

The Leaflet map allows three ways to set coordinates:

1. **Click on the map** — drops a marker at the clicked position
2. **Drag the marker** — updates coordinates on `dragend`
3. **GPS button** — calls `navigator.geolocation.getCurrentPosition()` with `enableHighAccuracy: true, timeout: 12s`
4. **Nominatim search** — debounced 500ms, searches `https://nominatim.openstreetmap.org/search?q=...&countrycodes=gr`

### Reverse geocoding (server-side, `lib/geocoding.ts`)

After form submission, the server calls Nominatim to resolve the coordinates back to a municipality name:

```http
GET https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json&accept-language=el&zoom=10
```

Field priority: `municipality → city → town → village → hamlet → city_district → suburb → county → state_district → state`

If no name is found at zoom=10, a second call is made at zoom=8 (regional unit level) as a fallback.

The returned name is then looked up in the `municipalities` table (exact match, then partial match). If no match is found, a new municipality row is auto-created with that name so the admin always sees the actual location name.

---

## 15. Email Notification System

Emails are sent when an admin clicks **Forward** on an approved report.

### Flow

```text
Admin clicks "Forward" in AdminReportList
  ↓
PATCH /api/admin/report/[id]  { action: "forward" }
  ↓
Fetch report + municipality from DB
  ↓
Validate: municipality exists + has email_official
  ↓
UPDATE reports SET status = 'forwarded'
  ↓
buildMunicipalityReportEmail(report, municipality)
  → { subject, html }
  ↓
sendEmail({ to, subject, html })   via Resend SDK
  ↓ success
INSERT email_logs { status: 'sent' }
Return 200 { ok: true }

  ↓ failure
INSERT email_logs { status: 'failed', error_message: ... }
Return 207 { ok: true, warning: "status changed but email failed: ..." }
```

The status transitions to `forwarded` even if the email fails. This ensures the report is never stuck in limbo. The admin is shown the warning inline.

### Email template (`lib/emailTemplates.ts`)

The email is a responsive HTML table layout written in inline CSS (required for email client compatibility). It contains:

- GreeceClean header bar (teal `#1D9E75` accent)
- Report category, municipality name, submission date, description (if any)
- Coordinates with a Google Maps link
- Report photo (if available)
- CTA button linking to `/r/<token>`
- Plain-text URL fallback

All user-supplied text (`description`) is HTML-escaped before insertion.

### Monitoring failed notifications

To find all failed emails in Supabase:

```sql
SELECT r.public_token, m.name_el, el.recipient_email, el.error_message, el.sent_at
FROM email_logs el
JOIN reports r ON r.id = el.report_id
LEFT JOIN municipalities m ON m.id = el.municipality_id
WHERE el.status = 'failed'
ORDER BY el.sent_at DESC;
```

---

## 16. Admin Workflow

The admin interface is a password-protected area at `/admin/`. It is intended for use by internal GreeceClean staff, not by the public.

### Dashboard (`/admin/dashboard`)

Reports are loaded in three separate sections:

| Section | Query | Typical action |
| --- | --- | --- |
| **Pending** | `is_approved=false AND status != 'rejected'` | Approve, reject, or mark cleaned |
| **Approved** | `is_approved=true` (max 100, newest first) | Forward to municipality |
| **Rejected** | `status='rejected'` (max 50, newest first) | Review or delete |

### Municipality Management (`/admin/municipalities`)

Displays all municipalities sorted by `name_el`. The admin can set or update `email_official` and `region` inline. A green dot indicates the municipality has a confirmed email address.

Reports cannot be forwarded to municipalities without a confirmed email — the `handleForward` function checks this and returns a 422 error.

### Inline Edit

Both `AdminReportList` and `MunicipalityEmailList` support inline editing — clicking "Edit" expands a second row in the same table without navigation. Changes are saved via `PATCH` API calls and the page is refreshed with `router.refresh()`.

---

## 17. Stub Mode (Demo without Supabase)

When `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent, `isSupabaseConfigured` is `false`. The app enters stub mode:

| Feature | Behaviour in stub mode |
| --- | --- |
| Landing page stats | Shows counts from `SEED_REPORTS` (17 items) |
| Public map | Renders the 17 seed reports as markers |
| Tracking page | Resolves against seed report tokens |
| Report submission | Returns fake token, no DB write, no storage upload |
| Admin dashboard | Returns empty lists with a 503 note |
| Admin API routes | Return `503 Supabase not configured` |

Seed data is in `lib/seed-data.ts` — 17 sample reports with real Greek municipality names and `picsum.photos` placeholder images.

Stub mode is purely for local development and demos. It is not suitable for production.

---

## 18. Styling System

Tailwind CSS with a custom design token layer defined in `tailwind.config.ts`.

### Brand colours

| Token | Hex | Usage |
| --- | --- | --- |
| `primary` | `#005BAE` | Deep blue — buttons, links, headings, header background |
| `primary-{50..900}` | Full palette | Tints for hover states, backgrounds |
| `action` | `#6B8E23` | Olive green — CTA buttons, success states, progress indicators |
| `action-{50..900}` | Full palette | Tints for hover states |

### Utility classes (in `globals.css`)

```css
.btn-primary   /* blue button: bg-primary text-white rounded-2xl */
.btn-action    /* green button: bg-action text-white rounded-2xl */
.card          /* white rounded card: bg-white rounded-2xl shadow-sm border p-6 */
```

### Border radius convention

All interactive elements (buttons, inputs, cards, modals, map containers) use `rounded-2xl` (1rem) by default. This is set as the base in `tailwind.config.ts`.

### Tailwind content scan

`tailwind.config.ts` includes `./lib/**/*.{js,ts,jsx,tsx}` in its `content` array. This is required because `lib/categories.ts` defines Tailwind class strings (e.g. `bg-red-50`, `text-red-600`) inside `CATEGORY_META` — without this entry, those classes would be purged in production builds and `CategoryBadge` circles would lose their colours.

---

## 19. Known Limitations & Future Work

### Current limitations

| Area | Limitation |
| --- | --- |
| **Rate limiting** | No server-side rate limiting on `/api/report`. The honeypot is the only bot mitigation. A determined attacker ignoring the honeypot can flood the database. Mitigate with Vercel's Bot Protection or a Cloudflare WAF rule. |
| **Admin auth** | Single shared password with no per-user accounts. If the password is compromised, all admin sessions must be invalidated by rotating `ADMIN_COOKIE_SECRET`. |
| **Session security** | HMAC comparison in `middleware.ts` is not constant-time. Not exploitable in practice over the network, but could be upgraded with `crypto.timingSafeEqual()`. |
| **Nominatim rate limit** | Nominatim's usage policy requires a maximum of 1 request/second and a valid `User-Agent`. The geocoding library sends `GreeceClean/1.0` but does not rate-limit. Under burst load this could result in Nominatim returning 429 responses and reports being saved without a municipality. |
| **No pagination** | The admin dashboard loads max 100 approved and 50 rejected reports. With very high volume these limits may need to be raised and replaced with cursor-based pagination. |
| **Email language** | Municipality notification emails are always sent in Greek, regardless of the locale setting. Municipalities are Greek entities, so this is intentional but worth noting. |
| **`proxy.ts`** | The file `proxy.ts` at the project root is a legacy artefact from before `middleware.ts` was created. It is not imported anywhere and can be safely deleted. |
| **`lib/notifications.ts`** | Also a legacy stub — the actual email logic lives in `lib/emailTemplates.ts`. `notifications.ts` can be deleted. |
| **`MunicipalityEmailList` React keys** | The component has the same Fragment key issue that was fixed in `AdminReportList`. The `<>` wrapper in its `tbody` map needs to be replaced with `<Fragment key={m.id}>`. |

### Suggested future improvements

- **Turnstile CAPTCHA** on the report form (Cloudflare's privacy-first CAPTCHA, already mentioned in the original spec)
- **Supabase Auth** for admin users — enables per-user audit trails and role-based access
- **Push notifications** — let citizens opt-in to status updates via Web Push
- **Municipality portal** — a read-only login for municipality staff to view and update their own reports directly
- **Bulk email forwarding** — forward all pending reports for a municipality in a single batch
- **Report clustering** on the map (Leaflet.markercluster) as report volume grows

---

## 20. How to Extend the Project

### Add a new report category

All category definitions are consolidated in `lib/categories.ts` — the single source of truth. API routes import `VALID_CATEGORIES` from there, so you no longer need to edit multiple route files.

1. **`lib/categories.ts`** — add the new value to `VALID_CATEGORIES` and add a corresponding entry to `CATEGORY_META` with `icon`, `emoji`, `bgColor`, `iconBg`, `iconColor`, and `borderHover` fields.

2. **`lib/i18n/el.ts`, `en.ts`, `de.ts`** — add the label to:
   - `form.categories[]` (shown in the report form step 1 grid)
   - `form.categoryLabels` (used for legacy/display label lookup)
   - `tracking.categories` (shown on the tracking page)

3. **`lib/emailTemplates.ts`** — add a label to `CATEGORY_LABELS` for the municipality notification email.

4. **`lib/priority.ts`** — if the new category warrants a non-default priority, add it to the appropriate branch of `calculateReportPriority()`.

No changes are needed to any API route files — they derive the valid list from `VALID_CATEGORIES` automatically.

### Add a new language

See [Section 11 — Adding a new language](#adding-a-new-language).

### Add a new admin action

1. Add a new `action` branch to the `PATCH /api/admin/report/[id]` handler
2. Add the corresponding button in `AdminReportList.tsx` (follow the existing pattern for mode-conditional rendering)
3. The `runAction()` helper handles loading state and error feedback

### Add a new database column to reports

1. Add `ALTER TABLE reports ADD COLUMN IF NOT EXISTS ...` to `schema.sql`
2. Update the `REPORT_SELECT` constant in `app/admin/dashboard/page.tsx`
3. Update the `Report` type in `app/(public)/r/[token]/page.tsx`
4. Update the `AdminReport` type in `components/AdminReportList.tsx`
5. If user-facing, add i18n strings to all three dictionaries

### Change the email template design

All template code is in `lib/emailTemplates.ts`. The colour constants at the top of the file (`ACCENT`, `BG`, `CARD_BG`, etc.) control the visual theme. The layout uses HTML tables for email client compatibility — do not convert to flexbox or grid.

---

## 21. Category & Priority System

### `lib/categories.ts` — single source of truth

All category definitions live in one file. Both API routes and UI components import from here, ensuring the valid list is never duplicated or out of sync.

```typescript
export type CategoryMeta = {
  icon: LucideIcon   // Lucide React icon component
  emoji: string      // consistent emoji used across all pages
  bgColor: string    // Tailwind bg class for card background (e.g. 'bg-red-50')
  iconBg: string     // Tailwind bg class for icon circle (e.g. 'bg-red-100')
  iconColor: string  // Tailwind text class for icon colour (e.g. 'text-red-600')
  borderHover: string // Tailwind border class on hover/selected state
}

export const CATEGORY_META: Record<string, CategoryMeta>
export const VALID_CATEGORIES: string[]  // derived from Object.keys(CATEGORY_META)
```

`VALID_CATEGORIES` is imported directly by `app/api/report/route.ts` and `app/api/admin/report/[id]/route.ts` for validation. No hardcoded category lists exist anywhere else in the codebase.

### `lib/priority.ts` — smart priority assignment

```typescript
export type Priority = 'urgent' | 'medium' | 'normal'

export function calculateReportPriority(category: string, submittedAt: Date): Priority
```

**Priority rules:**

| Priority | Condition |
| --- | --- |
| `urgent` | `sewage` or `illegal_dump` — always |
| `urgent` | `green_waste` submitted between May 1 and October 31 (Greek fire season) |
| `medium` | `construction_debris`, `abandoned_vehicle`, `coastal_pollution` |
| `normal` | All other categories |

```typescript
export const PRIORITY_LABELS: Record<Priority, Record<string, string>>
// e.g. { urgent: { el: 'Επείγον', en: 'Urgent', de: 'Dringend' }, ... }
```

Priority is calculated at display time in `AdminReportList` and shown via `PriorityBadge`. It is not stored in the database — it is always derived on the fly.

### `components/CategoryBadge.tsx` — shared display component

A server-compatible component (no `'use client'`) that renders a category as an emoji inside a pastel-coloured circle alongside a translated label.

```typescript
interface CategoryBadgeProps {
  categoryId: string      // key into CATEGORY_META
  label: string           // translated label string (caller provides i18n)
  size?: 'sm' | 'md'     // default: 'md'
}
```

Used on:
- Citizen tracking page (`/r/[token]`) — replaces plain text category label
- Admin dashboard table — category column
- Any future surface that displays a report category

### Tailwind content scan requirement

`CATEGORY_META` stores Tailwind class names as strings (e.g. `'bg-red-50'`). These are not statically analysable by Tailwind's content scanner unless `./lib/**/*.{js,ts,jsx,tsx}` is listed in `tailwind.config.ts → content`. Without this, all `CATEGORY_META` colour classes are purged in production and category badges appear unstyled.

The `tailwind.config.ts` `content` array must include:

```typescript
'./lib/**/*.{js,ts,jsx,tsx}'
```
