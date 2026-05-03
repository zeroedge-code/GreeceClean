<![CDATA[# GreeceClean — Technical Documentation

> Developer reference for architecture, database schema, API routes, security, and deployment.  
> Last updated: May 2026 — reflects the v2 multi-photo, 4-step report flow.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Database Schema](#4-database-schema)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Image Engine](#6-image-engine)
7. [Location Engine](#7-location-engine)
8. [i18n System](#8-i18n-system)
9. [API Reference](#9-api-reference)
10. [Admin Authentication](#10-admin-authentication)
11. [Email System](#11-email-system)
12. [Security](#12-security)
13. [State Management & Data Flow](#13-state-management--data-flow)
14. [Environment Variables](#14-environment-variables)
15. [Local Development Setup](#15-local-development-setup)
16. [QA & Edge Cases](#16-qa--edge-cases)

---

## 1. Architecture Overview

GreeceClean is a **Next.js 16 App Router** application deployed on Vercel. It is a monolith — no separate backend service — with three logical layers:

```
┌─────────────────────────────────────────────────────────┐
│                   Browser / Mobile                      │
│  React 19 client components (ReportForm, MapClient,     │
│  LocationPicker, AdminReportList)                       │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│              Next.js 16 App Router (Vercel Edge)        │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  Server Pages    │  │  API Routes (Node.js runtime) │ │
│  │  (RSC, SSR)      │  │  /api/report, /api/admin/*   │ │
│  └──────────────────┘  └──────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  proxy.ts (Edge Middleware) — Admin auth guard       │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          │                            │
┌─────────▼──────────┐    ┌────────────▼────────────┐
│  Supabase (EU)     │    │  External APIs           │
│  - PostgreSQL DB   │    │  - Nominatim (geocoding) │
│  - Storage (WebP)  │    │  - Resend (email)        │
│  - RLS policies    │    └─────────────────────────┘
└────────────────────┘
```

**Rendering strategy:**
- Public pages (`/`, `/map`, `/r/[token]`) — **server-side rendered** with `force-dynamic` for live data
- Report form (`/report`) — client component, all state in React hooks
- Admin dashboard — server-rendered list, client-side mutations via fetch
- API routes — Node.js runtime (required for `sharp` image processing)

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.x | App Router, SSR, API routes |
| Language | TypeScript | 5.x | Full type safety |
| UI | React | 19.x | Component library |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Database | Supabase (PostgreSQL) | — | Reports + municipalities storage |
| File storage | Supabase Storage | — | Compressed WebP images |
| Image processing | sharp | 0.33.x | Server-side WebP compression |
| EXIF reading | exifr | 7.x | Client-side GPS extraction from photos |
| Maps | Leaflet + OpenStreetMap | 1.9.x | Interactive pin placement |
| Geocoding | Nominatim (OSM) | REST | Reverse geocode coordinates → municipality |
| Email | Resend | 6.x | Transactional email to municipalities |
| Authentication | Custom HMAC cookie | — | Admin session management |
| Font | Inter (next/font) | — | Latin + Greek subsets |

---

## 3. Directory Structure

```
GreeceClean/
├── app/
│   ├── (public)/               # Public-facing pages (no auth)
│   │   ├── page.tsx            # Landing page with leaderboards
│   │   ├── map/page.tsx        # Live reports map
│   │   ├── report/page.tsx     # Report submission shell
│   │   └── r/[token]/page.tsx  # Public tracking page
│   ├── admin/                  # Admin section (protected by middleware)
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx  # Report moderation
│   │   └── municipalities/page.tsx
│   ├── api/                    # API routes (Node.js runtime)
│   │   ├── report/route.ts     # POST — public report submission
│   │   ├── locale/route.ts     # POST — language switch
│   │   └── admin/
│   │       ├── login/route.ts
│   │       ├── logout/route.ts
│   │       ├── report/[id]/route.ts     # PATCH + DELETE
│   │       └── municipalities/[id]/route.ts
│   ├── layout.tsx              # Root layout (locale, font, Header)
│   └── globals.css
│
├── components/
│   ├── ReportForm.tsx          # Multi-step client form (4 steps)
│   ├── LocationPicker.tsx      # Leaflet map with auto-GPS
│   ├── MapClient.tsx           # Full-page map with all reports
│   ├── MapWrapper.tsx          # SSR-safe dynamic import shell
│   ├── AdminReportList.tsx     # Admin moderation table
│   ├── Header.tsx              # Nav + language switcher
│   ├── LanguageSwitcher.tsx    # EL / EN / DE toggle
│   ├── LocaleProvider.tsx      # Context for client locale access
│   ├── CopyButton.tsx          # Clipboard copy with feedback
│   └── MunicipalityEmailList.tsx
│
├── lib/
│   ├── i18n/
│   │   ├── types.ts            # Dictionary type + Locale type
│   │   ├── index.ts            # getDictionary(), getLocale()
│   │   ├── el.ts               # Greek strings
│   │   ├── en.ts               # English strings
│   │   └── de.ts               # German strings
│   ├── supabase.ts             # Two Supabase clients (anon + service_role)
│   ├── geocoding.ts            # reverseGeocode() via Nominatim
│   ├── email.ts                # sendEmail() via Resend
│   ├── emailTemplates.ts       # buildMunicipalityReportEmail()
│   ├── seed-data.ts            # Static fallback reports (no-Supabase mode)
│   └── notifications.ts
│
├── supabase/
│   ├── schema.sql              # DB tables, types, RLS, indexes, triggers
│   ├── email_notifications.sql # email_logs table
│   ├── seed.sql                # 27 sample reports (development)
│   └── seed_municipalities.sql # Greek municipalities with emails
│
├── proxy.ts                    # Next.js middleware (admin auth guard)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Design patterns:**
- **No global state manager** — each page fetches its own data server-side; client components manage local form/UI state with `useState` / `useReducer`
- **Two Supabase clients** — `supabase` (anon, RLS-constrained, browser-safe) and `supabaseAdmin` (service role, API routes only)
- **Stub mode** — when `NEXT_PUBLIC_SUPABASE_URL` is not set, the app falls back to `lib/seed-data.ts` so the UI works without a database

---

## 4. Database Schema

### `municipalities`

```sql
CREATE TABLE municipalities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_el        TEXT NOT NULL,                   -- Greek name (e.g. "Δήμος Αθηναίων")
  name_en        TEXT NOT NULL DEFAULT '',        -- English name
  email_official TEXT,                            -- Official contact email
  region         TEXT,                            -- Administrative region
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Auto-generated primary key |
| `name_el` | TEXT | Greek municipality name — used for matching |
| `name_en` | TEXT | English name — used in admin UI |
| `email_official` | TEXT | Destination for forwarded reports |
| `region` | TEXT | Administrative region (e.g. "Αττική") |

---

### `reports`

```sql
CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token    TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  image_url       TEXT,           -- Primary image (backwards compat)
  image_urls      JSONB,          -- All images as JSON array (up to 3)
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other',
  status          report_status NOT NULL DEFAULT 'pending',
  is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Internal identifier |
| `public_token` | TEXT | 12-char hex — used in `/r/<token>` URLs |
| `image_url` | TEXT | First image URL (kept for backward compatibility) |
| `image_urls` | JSONB | Array of all image URLs, e.g. `["https://...1.webp","https://...2.webp"]` |
| `lat` / `lng` | DOUBLE PRECISION | WGS-84 coordinates |
| `category` | TEXT | One of: `illegal_dump`, `roadside_litter`, `abandoned_vehicle`, `vandalism`, `other` |
| `status` | ENUM | See status enum below |
| `is_approved` | BOOLEAN | `true` = visible on public map |
| `municipality_id` | UUID | FK to `municipalities` |
| `description` | TEXT | Optional user-supplied note (max 500 chars) |

**`report_status` enum values:**

| Value | Meaning |
|-------|---------|
| `pending` | Submitted, awaiting admin review |
| `in_review` | Approved by admin, visible on map |
| `forwarded` | Email sent to municipality |
| `resolved` | Municipality confirmed cleanup |
| `rejected` | Spam, duplicate, or invalid |

---

### `email_logs`

```sql
CREATE TABLE email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID REFERENCES reports(id) ON DELETE CASCADE,
  municipality_id UUID REFERENCES municipalities(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Every forwarding attempt is logged regardless of success or failure, enabling audit trails and retry logic.

---

### Auto-update Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
```

---

### Indexes

```sql
CREATE INDEX idx_reports_status       ON reports(status);
CREATE INDEX idx_reports_municipality ON reports(municipality_id);
CREATE INDEX idx_reports_public_token ON reports(public_token);

-- Earth-distance index for geographic proximity queries
CREATE INDEX idx_reports_location ON reports
  USING GIST (ll_to_earth(lat, lng));
```

The GIST index on `ll_to_earth(lat, lng)` enables fast nearest-neighbour queries for the "nearby reports" navigation on the tracking page (implemented in application code using the Haversine formula).

---

## 5. Row Level Security (RLS)

All tables have RLS enabled. The service role key (used only in API routes) bypasses RLS automatically.

```sql
-- Public: read-only access to approved reports
CREATE POLICY "Public can read approved reports" ON reports
  FOR SELECT USING (is_approved = TRUE);

-- Public: anyone can submit a report (insert)
CREATE POLICY "Anyone can submit a report" ON reports
  FOR INSERT WITH CHECK (TRUE);

-- Public: read all municipalities (names are public data)
CREATE POLICY "Public can read municipalities" ON municipalities
  FOR SELECT USING (TRUE);
```

All write operations on reports (approve, reject, forward, delete) are performed server-side using `supabaseAdmin` (service role), which bypasses RLS. The anon client is used only for public reads.

---

## 6. Image Engine

### Client-Side Pre-compression (`compressToFile`)

Before uploading, the browser downsizes each photo to a maximum dimension of **1,200 px** at JPEG quality 0.82. This is critical for two reasons:

1. **OOM prevention on mobile** — a 48 MP camera produces a ~192 MB decoded image; keeping it in memory alongside the Leaflet map kills the browser tab
2. **Vercel 4.5 MB request body limit** — original photos (10-15 MB) exceed this; compressed files are 100–300 KB

```typescript
// components/ReportForm.tsx
function compressToFile(file: File, maxPx = 1200): Promise<{ preview: string; compressed: File }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      const preview = canvas.toDataURL('image/jpeg', 0.82)
      canvas.toBlob((blob) => {
        const compressed = blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
        resolve({ preview, compressed })
      }, 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ preview: url, compressed: file }) }
    img.src = url
  })
}
```

### Server-Side Recompression (`compressImage`)

The API route applies a second pass using `sharp`, converting to **WebP** format with progressive quality degradation until the output is under 500 KB:

```typescript
// app/api/report/route.ts
const MAX_BYTES = 500 * 1024

async function compressImage(raw: Buffer): Promise<Buffer> {
  const attempts = [
    { width: 1920, quality: 80 },
    { width: 1200, quality: 65 },
    { width: 900,  quality: 50 },
    { width: 700,  quality: 30 },
  ] as const

  for (const { width, quality } of attempts) {
    const buf = await sharp(raw)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
    if (buf.length <= MAX_BYTES) return buf
  }
  throw new Error('Image cannot be compressed below 500 KB')
}
```

### Storage Naming Convention

Images are stored in the `reports` Supabase Storage bucket with predictable paths:

| Photo slot | Storage path |
|-----------|-------------|
| First (main) | `{publicToken}.webp` |
| Second | `{publicToken}_2.webp` |
| Third | `{publicToken}_3.webp` |

Public URLs are stored in `image_url` (first) and `image_urls` (JSON array of all).

---

## 7. Location Engine

### EXIF GPS Extraction

When a user selects a photo from their library, the `exifr` library reads the file's EXIF metadata **before compression** (compression strips EXIF):

```typescript
// components/ReportForm.tsx — runs in parallel with compression
const [{ preview, compressed }] = await Promise.all([
  compressToFile(file),
  exifr.gps(file).then((result) => {
    if (result?.latitude != null && result?.longitude != null) {
      setExifCoords({ lat: result.latitude, lng: result.longitude })
    }
  }).catch(() => null),
])
```

If EXIF coordinates are found, they are passed to `LocationPicker` as `initialCoords`, which immediately opens the map at that location — no GPS permission required.

### Hybrid Map Picker (`LocationPicker.tsx`)

The location step operates in three modes depending on available data:

| Scenario | Behaviour |
|----------|-----------|
| EXIF coords found | Map opens immediately, centred on photo location |
| No EXIF → GPS auto-fires on mount | Spinner shown; map opens when `getCurrentPosition()` resolves |
| GPS denied / unavailable | Error banner + manual "Open map" button |

The map is **lazy-loaded**: Leaflet's JavaScript is `require()`'d inside a `useEffect` (never at module level). This prevents Leaflet from executing during SSR and avoids the OOM scenario where a full-resolution image and Leaflet tiles both decode simultaneously.

```typescript
// components/LocationPicker.tsx
useEffect(() => {
  if (!mapVisible) return        // Leaflet only loads after map is opened
  const el = containerRef.current
  if (!el || mapRef.current) return

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof LeafletType
  // ...map init
}, [mapVisible])
```

The CSS must remain a **top-level static import** (not inside the effect), because Turbopack does not process `require()` calls for CSS:

```typescript
import 'leaflet/dist/leaflet.css'  // ✅ top-level — processed by Turbopack
// NOT: require('leaflet/dist/leaflet.css') inside useEffect — silently ignored
```

### Reverse Geocoding (`lib/geocoding.ts`)

After the user confirms their pin, the server calls Nominatim to identify the municipality:

```typescript
export async function reverseGeocode(lat: number, lng: number) {
  // Attempt zoom=10 (municipality level) first, fall back to zoom=8 (county)
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GreeceClean/1.0 (contact@greececlean.gr)' },
    cache: 'no-store',
  })
  const data = await res.json()
  // Extracts: municipality → city → town → village → county (in priority order)
  const name = data.address?.municipality ?? data.address?.city ?? ...
  return { municipalityName: name ?? '' }
}
```

If the resolved municipality name is not already in the database, it is **auto-created** (`INSERT INTO municipalities (name_el, name_en) VALUES (...)`), ensuring no report is ever lost due to an unknown municipality.

---

## 8. i18n System

### Structure

```
lib/i18n/
├── types.ts      # Locale = 'el' | 'en' | 'de'; Dictionary interface
├── index.ts      # getDictionary(locale), getLocale() from cookie
├── el.ts         # Greek — default language
├── en.ts         # English
└── de.ts         # German
```

### `Dictionary` Type

The `Dictionary` interface is the single source of truth for all UI strings. Every page and component receives translations as props — there are no inline strings in JSX:

```typescript
export type Dictionary = {
  nav:      { home: string; map: string; report: string }
  landing:  { heroTitle: string; heroHighlight: string; ... }
  tracking: { pageTitle: string; steps: [string, string, string, string]; ... }
  form:     { photoTitle: string; categoryTitle: string; submitTitle: string; ... }
  map:      { statuses: { pending: string; resolved: string; ... }; ... }
  copy:     { copy: string; copied: string }
}
```

Adding a new string requires changes in three places:
1. `lib/i18n/types.ts` — add the key to `Dictionary`
2. `lib/i18n/el.ts`, `en.ts`, `de.ts` — provide the translation in each language

TypeScript will error at build time if any language file is missing a key.

### Language Detection & Switching

```typescript
// lib/i18n/index.ts
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value
  return LOCALES.includes(locale as Locale) ? (locale as Locale) : DEFAULT_LOCALE
}
```

The `LanguageSwitcher` component calls `POST /api/locale` with the selected locale, which sets a 1-year cookie. The next server render reads this cookie and passes the correct `Dictionary` to all components.

---

## 9. API Reference

### `POST /api/report`

Public endpoint — no authentication required.

**Request:** `multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| `image` | File | ✅ | First / main photo |
| `image2` | File | ☑️ | Second photo (optional) |
| `image3` | File | ☑️ | Third photo (optional) |
| `lat` | string (float) | ✅ | Latitude |
| `lng` | string (float) | ✅ | Longitude |
| `category` | string | ✅ | One of the 5 valid category values |
| `description` | string | ☑️ | Optional, max 500 chars |
| `hp_field` | string | — | Honeypot — must be empty or request is silently discarded |

**Responses:**

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{ token, trackingUrl }` | Report created successfully |
| `400` | `{ error }` | Missing required fields or malformed body |
| `413` | `{ error }` | Any single image exceeds 10 MB |
| `422` | `{ error }` | Invalid category or image cannot be compressed |
| `500` | `{ error }` | Supabase or storage error |

**Processing pipeline:**

```
1. Validate honeypot (empty → continue, filled → fake 200 response)
2. Validate fields (presence, size, category whitelist)
3. Compress each image with sharp (WebP, target ≤ 500 KB)
4. Generate public_token (12-char hex via crypto.randomUUID)
5. Reverse geocode lat/lng → municipality name
6. [Parallel] Upload images to Supabase Storage
7. [Parallel] Resolve or auto-create municipality in DB
8. INSERT into reports table
9. Return { token, trackingUrl }
```

---

### `PATCH /api/admin/report/[id]`

Admin-only. Requires valid `admin_session` cookie.

**Request:** `application/json`

| `action` value | Effect |
|---------------|--------|
| `approve` | Sets `is_approved = true`, `status = 'in_review'` |
| `reject` | Sets `is_approved = false`, `status = 'rejected'` |
| `deactivate` | Sets `is_approved = false`, `status = 'pending'` |
| `mark_cleaned` | Sets `status = 'resolved'` |
| `forward` | Sends email to municipality; sets `status = 'forwarded'`; logs to `email_logs` |
| `edit` | Updates `category`, `status`, `municipality_id`, `description` (all optional) |

**Forward action detail:**

The forward action involves four sequential steps:

```typescript
1. Fetch report + municipality (validate email exists)
2. UPDATE reports SET status = 'forwarded'
3. sendEmail({ to: muni.email_official, subject, html })
4. INSERT INTO email_logs (status: 'sent' | 'failed', error_message)
```

If the email fails but the status update succeeds, the endpoint returns HTTP **207 Multi-Status** with a `warning` field. The admin UI surfaces this warning without marking the action as failed.

---

### `DELETE /api/admin/report/[id]`

Admin-only.

1. Fetches `public_token` for the report
2. Removes associated `.webp` files from Supabase Storage
3. Deletes the database row (cascades to `email_logs` via FK)

---

### `POST /api/admin/login`

**Request:** `multipart/form-data` with `password`

Validates against `ADMIN_PASSWORD` using `crypto.timingSafeEqual`. On success:
- Computes HMAC-SHA256 token: `HMAC(sha256, adminPassword + ':' + cookieSecret)`
- Sets `admin_session` cookie: `httpOnly`, `secure`, `sameSite=lax`, `maxAge=28800` (8 hours)
- Redirects to `/admin/dashboard`

---

### `POST /api/locale`

**Request:** `application/json` — `{ locale: 'el' | 'en' | 'de' }`

Sets the `locale` cookie (1-year expiry). No authentication required.

---

## 10. Admin Authentication

Authentication is cookie-based using **HMAC-SHA256** — no database sessions, no JWT library.

### Token Generation

```typescript
// app/api/admin/login/route.ts
const secret = process.env.ADMIN_COOKIE_SECRET!
const payload = `${adminPassword}:${secret}`
const hmac = createHmac('sha256', secret).update(payload).digest('hex')
// Cookie value: hmac
```

### Token Validation (`proxy.ts`)

The middleware runs on the Vercel Edge runtime and intercepts all `/admin/*` and `/api/admin/*` requests:

```typescript
// proxy.ts
const token    = req.cookies.get('admin_session')?.value ?? ''
const expected = createHmac('sha256', cookieSecret)
  .update(`${adminPassword}:${cookieSecret}`)
  .digest('hex')

// Length check first to avoid timingSafeEqual throwing on mismatch
if (
  token.length !== expected.length ||
  !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
) {
  return NextResponse.redirect(new URL('/admin/login', req.url))
}
```

`timingSafeEqual` prevents timing-based side-channel attacks that could allow an attacker to guess the token one byte at a time.

---

## 11. Email System

### Email Transport (`lib/email.ts`)

Resend is used for transactional email. The client is lazily initialised:

```typescript
import { Resend } from 'resend'
let resend: Resend | null = null

export async function sendEmail({ to, subject, html }: EmailPayload) {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'GreeceClean <noreply@greececlean.gr>',
    to, subject, html,
  })
  if (error) throw new Error(error.message)
}
```

### Email Template (`lib/emailTemplates.ts`)

Municipality notification emails are written in **Greek** regardless of the reporting user's language, since they are addressed to Greek local government officials. The template includes:

- Report category (translated label)
- Municipality name
- Submission date
- User description (HTML-escaped)
- GPS coordinates with a Google Maps deep-link
- Photo (the `image_url` of the first image)
- CTA button linking to the public tracking page
- Footer with app branding

All user-supplied content is HTML-escaped before insertion into the template to prevent XSS in email clients.

---

## 12. Security

### Honeypot Bot Protection

The report form includes a hidden field (`hp_field`) that is invisible to humans but typically filled in by bots:

```html
<!-- Positioned off-screen, tabIndex=-1, autoComplete=off -->
<input id="hp_field" name="hp_field" type="text" tabIndex={-1} autoComplete="off" />
```

On the server, if `hp_field` is non-empty, the request receives a **fake 200 response** with a randomly generated token. Bots receive no error signal and cannot determine their submission was discarded.

### Timing-Safe Comparisons

Both the admin password check and the session cookie validation use `crypto.timingSafeEqual` to prevent timing oracle attacks:

```typescript
import { timingSafeEqual } from 'crypto'

const a = Buffer.from(suppliedPassword)
const b = Buffer.from(adminPassword)
// Length equality checked first (timingSafeEqual throws on length mismatch)
if (a.length !== b.length || !timingSafeEqual(a, b)) {
  return /* auth failure */
}
```

### Row Level Security

Public users can only read `is_approved = TRUE` reports. Insert is unrestricted (the honeypot handles spam; admin review handles the rest). All mutations go through the service role in server-side API routes.

### Input Validation

| Validation | Location |
|-----------|----------|
| Image size ≤ 10 MB | `POST /api/report` |
| Category whitelist | `POST /api/report` + `PATCH /api/admin/report/[id]` |
| Description max 500 chars | Client (textarea `maxLength`) + server (`.slice(0, 500)`) |
| UUID format for `municipality_id` | `PATCH /api/admin/report/[id]` |
| Status enum whitelist | `PATCH /api/admin/report/[id]` |
| Locale whitelist | `POST /api/locale` |

### Content Security

- Admin cookie: `httpOnly` (JS cannot read it), `secure` (HTTPS only), `sameSite=lax` (CSRF mitigation)
- `SUPABASE_SERVICE_ROLE_KEY` never exposed to the browser — only used in server-side API routes
- User-supplied content HTML-escaped in email templates

---

## 13. State Management & Data Flow

GreeceClean uses **no global state manager**. State is kept as close to where it is needed as possible:

| Layer | Pattern |
|-------|---------|
| Public pages | Server components fetch data directly (no client state) |
| Report form | `useState` in `ReportForm.tsx` for form steps, photos, coords |
| Admin list | Server renders list; `useState` in `AdminReportList.tsx` for edit drafts and loading states |
| Language | Cookie (server) + `LocaleProvider` context (client, read-only) |
| Draft persistence | `localStorage` key `gc_draft` — saves category, coords, description |

### LocalStorage Draft

The report form saves progress after each step to prevent abandonment:

```typescript
const DRAFT_KEY = 'gc_draft'
type Draft = { category?: string; coords?: { lat: number; lng: number }; description?: string }

function saveDraft(updates: Partial<Draft>) {
  const existing: Draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}')
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...existing, ...updates }))
}
```

On mount, if a draft exists with a saved `category`, the form skips step 1 and opens at step 2 (photos), with the previously chosen category pre-selected. Photos cannot be serialised, so users must re-upload them after a refresh. The draft is cleared on successful submission.

---

## 14. Environment Variables

| Variable | Runtime | Required | Description |
|----------|---------|:--------:|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | ✅ | Supabase anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ✅ | Supabase service role (bypasses RLS). **Never expose.** |
| `NEXT_PUBLIC_APP_URL` | Browser + Server | ✅ | Public base URL (e.g. `https://greececlean.vercel.app`) |
| `ADMIN_PASSWORD` | Server only | ✅ | Admin dashboard password |
| `ADMIN_COOKIE_SECRET` | Server only | ✅ | 32-byte hex secret for HMAC cookie signing. Generate: `openssl rand -hex 32` |
| `RESEND_API_KEY` | Server only | ✅ | Resend API key for municipality email forwarding |
| `EMAIL_FROM` | Server only | ☑️ | Sender address override (default: `GreeceClean <noreply@greececlean.gr>`) |

`NEXT_PUBLIC_*` variables are embedded in the client bundle at build time. All others are server-only.

---

## 15. Local Development Setup

### Full Setup

```bash
# 1. Clone
git clone https://github.com/Papariga999/GreeceClean.git
cd GreeceClean

# 2. Install
npm install

# 3. Environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase + Resend credentials

# 4. Database (run in Supabase SQL editor, in order)
# supabase/schema.sql
# supabase/email_notifications.sql
# supabase/seed_municipalities.sql
# supabase/seed.sql   (optional — 27 sample reports)

# 5. Run
npm run dev
# → http://localhost:3000
```

### Stub Mode (No Supabase)

If `NEXT_PUBLIC_SUPABASE_URL` is not set, the app runs in **stub mode**:
- The public map and tracking pages use `lib/seed-data.ts` (17 hardcoded reports)
- Report submission logs to the server console and returns a fake token
- The admin dashboard will not function

Stub mode is useful for rapid UI development without needing a database.

### Production Build

```bash
npm run build    # Compiles to /.next
npm run start    # Starts production server on :3000
```

### Deployment to Vercel

```bash
git push origin main   # Vercel auto-deploys on push to main
```

Required Vercel configuration:
- **Framework Preset:** Next.js (auto-detected)
- **Node.js version:** 18.x or higher
- **Environment variables:** Set all 8 variables in Project → Settings → Environment Variables
- **Region:** eu-central-1 recommended (matches Supabase EU region)

---

## 16. QA & Edge Cases

### Stress Test Results

The codebase underwent an intensive QA review covering the following scenarios:

| Category | Test | Result |
|----------|------|--------|
| **Images** | 48 MP HEIC from iPhone (192 MB decoded) | ✅ Compressed to <300 KB client-side; no OOM |
| **Images** | Photo with no EXIF GPS (WhatsApp, screenshot) | ✅ Falls back to device GPS automatically |
| **Images** | 3 photos all above 10 MB | ✅ Each validated server-side; 413 returned per-image |
| **API** | Supabase storage upload failure | ✅ Returns 500; no partial DB row created |
| **API** | Municipality not in database | ✅ Auto-created with `INSERT ... ON CONFLICT` pattern |
| **API** | Honeypot field filled | ✅ Silent fake 200; no data stored |
| **API** | Nominatim timeout | ✅ Municipality falls back to empty string; report still saved |
| **Maps** | Leaflet import in SSR context | ✅ Prevented via `require()` inside `useEffect` |
| **Maps** | Leaflet CSS missing (Turbopack) | ✅ Fixed with top-level `import 'leaflet/dist/leaflet.css'` |
| **Mobile** | OOM crash on location step | ✅ Resolved: photos compressed before entering state; Leaflet lazy-loaded |
| **Mobile** | Camera access denied | ✅ `cameraError` state shows localised message |
| **Data** | Negative EPS | ✅ Displayed as-is; no NaN or crash |
| **Admin** | Email send fails (Resend down) | ✅ HTTP 207 returned; status still updated; error logged to `email_logs` |
| **Admin** | Concurrent admin edits | ✅ Last-write-wins; DB `updated_at` trigger records each change |
| **Auth** | Cookie with wrong HMAC | ✅ Timing-safe rejection; redirect to login |
| **Auth** | Brute-force password attempts | ✅ No rate-limit (admin only), but timing-safe prevents oracle attack |
| **i18n** | Missing translation key | ✅ TypeScript build error — enforced at compile time |
| **Draft** | LocalStorage unavailable (private mode) | ✅ `try/catch` around all localStorage calls; fails silently |

### Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| No rate limiting on `POST /api/report` | High-volume bot attacks possible | Honeypot + Vercel's built-in DDoS protection |
| Municipality name matching is string-based | Reports for uncommon municipalities may create duplicates | Partial `ILIKE %name%` match covers most cases; admin can merge |
| No real-time map updates | New reports appear only on page refresh | Acceptable UX; could add SWR polling in future |
| Email forwarding is manual (admin-triggered) | Municipality notification delayed | Roadmap: auto-forward on approval |

---

_Back to [README.md](../README.md)_
]]>
