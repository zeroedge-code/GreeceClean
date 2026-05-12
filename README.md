# 🌿 GreeceClean

**Civic reporting infrastructure for a cleaner Greece.**

GreeceClean lets anyone report illegal dumping, litter, sewage, coastal pollution, abandoned vehicles, and other environmental hazards in under a minute — with no account required. Reports include photos, GPS coordinates, category, priority, and a public tracking link, then can be reviewed and forwarded to the responsible municipality.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Why GreeceClean exists

Illegal dumping is often visible to citizens long before it is visible to public authorities. Construction debris on mountain roads, tyres near beaches, appliances in riverbeds, sewage leaks, and coastal waste can remain unresolved because the reporting process is slow, fragmented, or unclear.

GreeceClean closes that gap by turning every smartphone into a civic reporting terminal.

A citizen can photograph the issue, confirm the location, choose a category, and submit a structured report. The system stores the report, assigns priority, identifies the relevant municipality, and creates a public tracking page that can be shared with local communities, journalists, NGOs, and officials.

The goal is simple: **make environmental problems easy to report, hard to ignore, and publicly trackable until resolved.**

---

## Core concept

```text
Photo → Location → Category → Submit → Public tracking link → Municipality action
```

GreeceClean is built around a no-login reporting loop. Users do not need to create an account, remember a password, or understand municipal bureaucracy. Every report receives a permanent public URL such as:

```text
/r/ab12cd34ef56
```

That URL becomes the public record for the incident. It shows the report status, photos, location, nearby related reports, and share options.

---

## Key features

### No-login reporting

The main report flow is designed for mobile users and takes less than one minute.

| Step | Action           | Details                                                                                                                                  |
| ---- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Choose category  | Select from environmental issue types such as illegal dump, construction debris, sewage, tyres, appliances, coastal pollution, and more. |
| 2    | Add photos       | Upload or capture up to 3 photos. Images are compressed server-side to WebP.                                                             |
| 3    | Confirm location | Use automatic GPS, EXIF GPS from photos, map pin adjustment, or search.                                                                  |
| 4    | Submit           | Add an optional description or skip directly to submission.                                                                              |
| 5    | Share            | Receive a public tracking link with WhatsApp and copy-link sharing.                                                                      |

### Public tracking pages

Each report has a public page showing:

* Current status: Submitted, Verified, Municipality Notified, Cleaned Up
* Photo evidence
* Location map
* Nearby similar reports using Haversine distance
* Share buttons for WhatsApp and link copying
* A permanent, human-shareable report URL

### Municipality accountability

The landing page includes public leaderboards that make municipal performance visible.

| Leaderboard              | Metric                                 | Purpose                                           |
| ------------------------ | -------------------------------------- | ------------------------------------------------- |
| 🏆 Cleanliness Champions | Highest percentage of resolved reports | Rewards municipalities that respond quickly.      |
| ⚠️ Room for Improvement  | Most unresolved pending reports        | Highlights areas where reports are being ignored. |

This creates a public accountability loop: citizens report, municipalities respond, and performance becomes visible.

### Smart priority assignment

Reports are automatically assigned a priority when submitted.

| Priority            | Categories                                                      | Notes                                                          |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| 🔴 Urgent           | `sewage`, `illegal_dump`                                        | Always treated as urgent due to health and environmental risk. |
| 🔴 Urgent, seasonal | `green_waste`                                                   | Urgent during Greek fire season, May 1 through October 31.     |
| 🟡 Medium           | `construction_debris`, `abandoned_vehicle`, `coastal_pollution` | Moderate impact or administrative complexity.                  |
| ⚪ Normal            | All other categories                                            | Standard queue.                                                |

Priority logic lives in:

```text
lib/priority.ts
```

### EXIF-based location detection

When a user uploads a photo, GreeceClean attempts to read GPS coordinates from the image’s EXIF metadata using `exifr`. When coordinates are available, the map opens at the photo location without requiring a browser GPS prompt.

When EXIF GPS data is unavailable, the app falls back to the device geolocation API.

### Multilingual interface

GreeceClean supports Greek, English, and German.

| Language | Code | Purpose                                             |
| -------- | ---: | --------------------------------------------------- |
| Greek    | `el` | Default language and municipality communication.    |
| English  | `en` | Tourists, international users, and NGO partners.    |
| German   | `de` | German-speaking diaspora and partner organizations. |

Language preference is stored in a cookie and applied server-side for localized metadata and SEO.

### Admin review and municipal forwarding

Admins can review submitted reports, approve them, and forward structured emails to the relevant municipality. Municipality email forwarding is powered by Resend and logged in the database.

---

## Tech stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Framework      | Next.js 16              |
| Language       | TypeScript              |
| Styling        | Tailwind CSS            |
| Database       | Supabase PostgreSQL     |
| Spatial data   | PostGIS                 |
| Storage        | Supabase Storage        |
| Email          | Resend                  |
| Maps           | Leaflet / OpenStreetMap |
| Geocoding      | Nominatim               |
| Image metadata | exifr                   |

---

## User journey

```text
1. Citizen finds an environmental issue
   ↓
2. Opens GreeceClean on mobile
   ↓
3. Selects a report category
   ↓
4. Adds photos
   └─ EXIF GPS is extracted when available
   ↓
5. Confirms or adjusts location on the map
   └─ Browser GPS is used as fallback
   ↓
6. Adds an optional description
   ↓
7. Submits the report
   ├─ Images are compressed and uploaded
   ├─ Report is saved with status: pending
   ├─ Priority is assigned automatically
   └─ Municipality is identified using spatial lookup
   ↓
8. Receives a public tracking URL
   ↓
9. Shares the report with the local community
   ↓
10. Admin reviews and approves
    ↓
11. Municipality is notified
    ↓
12. Report is marked cleaned when resolved
```

---

## Design system: Aegean Clean

GreeceClean uses a custom visual identity called **Aegean Clean**. The design is civic, approachable, mobile-first, and inspired by the Greek landscape.

| Token     |       Hex | Usage                                                              |
| --------- | --------: | ------------------------------------------------------------------ |
| `primary` | `#005BAE` | Navigation, headings, primary buttons, and key UI elements.        |
| `action`  | `#6B8E23` | CTAs, confirmation states, resolved badges, and positive feedback. |

The interface uses large rounded corners, clean spacing, accessible contrast, and Inter typography with Greek and Latin subsets loaded through `next/font`.

---

## Getting started

### Prerequisites

* Node.js 18 or newer
* npm 9 or newer
* A Supabase project
* A Resend account

### 1. Clone the repository

```bash
git clone https://github.com/Papariga999/GreeceClean.git
cd GreeceClean
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then fill in the required values listed in [Environment variables](#environment-variables).

### 4. Initialize the database

Run the SQL files in this order from the Supabase SQL editor:

```bash
supabase/schema.sql
supabase/email_notifications.sql
supabase/seed_municipalities.sql
supabase/migrations/001_postgis_geometry.sql
supabase/seed.sql
```

The final `seed.sql` file is optional and inserts sample development reports.

> Note: The PostGIS migration requires the `postgis` extension to be enabled in Supabase under **Database → Extensions**.

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Environment variables

| Variable                        | Required | Description                                                                     |
| ------------------------------- | :------: | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      |    Yes   | Supabase project URL.                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |    Yes   | Supabase anon key. Safe for browser use.                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     |    Yes   | Supabase service role key. Never expose this to the browser.                    |
| `NEXT_PUBLIC_APP_URL`           |    Yes   | Public app URL, for example `https://greececlean.gr`.                           |
| `ADMIN_PASSWORD`                |    Yes   | Password for the admin dashboard.                                               |
| `ADMIN_COOKIE_SECRET`           |    Yes   | 32-byte secret for signed admin sessions. Generate with `openssl rand -hex 32`. |
| `RESEND_API_KEY`                |    Yes   | Resend API key for municipality email forwarding.                               |
| `EMAIL_FROM`                    | Optional | Sender address. Defaults to `GreeceClean <noreply@greececlean.gr>`.             |

---

## Common commands

```bash
npm run dev      # Start local development server
npm run build    # Build production app
npm run start    # Start production server
npm run lint     # Run linting, if configured
```

---

## Deployment

### Vercel

Vercel is the recommended deployment target.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add all required environment variables in **Settings → Environment Variables**.
4. Deploy from the `main` branch.

Future pushes to `main` will trigger automatic deployments.

### Manual production build

```bash
npm run build
npm run start
```

---

## Project structure

```text
GreeceClean/
├── app/                    # Next.js app routes and pages
├── components/             # Reusable UI components
├── lib/                    # Shared utilities, i18n, priority logic, clients
├── public/                 # Static assets
├── supabase/               # Schema, migrations, seeds, SQL helpers
├── docs/                   # Technical documentation
└── README.md
```

For deeper architecture, API, database, and security details, see:

```text
docs/TECHNICAL_DOCS.md
```

---

## Contributing

Contributions are welcome.

1. Fork the repository.

2. Create a feature branch.

   ```bash
   git checkout -b feature/my-feature
   ```

3. Make your changes.

4. Commit with a clear message.

5. Open a pull request against `main`.

### Translation requirements

GreeceClean is multilingual. Any user-facing string must be added to all translation files:

```text
lib/i18n/el.ts
lib/i18n/en.ts
lib/i18n/de.ts
```

Also update the shared dictionary type:

```text
lib/i18n/types.ts
```

---

## Roadmap

### Planned

| Feature                     | Priority | Notes                                                                 |
| --------------------------- | :------: | --------------------------------------------------------------------- |
| 🗺️ Cluster map             |   High   | Group nearby report pins for large-scale map readability.             |
| 📄 PDF report export        |  Medium  | Generate a one-page official-style report for printing or submission. |
| 🔔 Status notifications     |  Medium  | Notify users when a report status changes.                            |
| 👤 Optional user portfolios |  Medium  | Let users opt in to track their own submissions.                      |
| 🏛️ NGO partnership portal  |  Medium  | Bulk access and API support for partner organizations.                |
| 📊 Analytics dashboard      |    Low   | Regional heatmaps and time-to-resolution trends.                      |
| 🌍 Multi-country expansion  |    Low   | Adapt the system for nearby Balkan countries.                         |
| 🤖 AI category detection    |    Low   | Suggest report category from uploaded photos.                         |

### Shipped

| Feature                         | Status | Notes                                                         |
| ------------------------------- | :----: | ------------------------------------------------------------- |
| Municipality email forwarding   |  Live  | Admin-approved reports can be forwarded through Resend.       |
| PostGIS municipality assignment |  Live  | Reports are assigned to municipalities using spatial queries. |
| Public report tracking          |  Live  | Each submission receives a shareable status page.             |
| Multilingual UI                 |  Live  | Greek, English, and German support.                           |
| EXIF GPS detection              |  Live  | Photo metadata can pre-fill report location.                  |

---

## Acknowledgements

GreeceClean is built with open civic technology principles and open web infrastructure, including OpenStreetMap, Leaflet, Supabase, Next.js, and the broader open-source ecosystem.
