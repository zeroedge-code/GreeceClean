// All user-visible text is in Greek; comments in English.

const ACCENT   = '#1D9E75'
const BG       = '#f9fafb'
const CARD_BG  = '#ffffff'
const TEXT      = '#1f2937'
const MUTED     = '#6b7280'
const BORDER    = '#e5e7eb'

const CATEGORY_LABELS: Record<string, string> = {
  illegal_dump:      'Παράνομη Χωματερή',
  roadside_litter:   'Σκουπίδια στο Δρόμο',
  abandoned_vehicle: 'Εγκαταλελειμμένο Όχημα',
  vandalism:         'Βανδαλισμός',
  other:             'Άλλο',
}

export type ReportForEmail = {
  id: string
  public_token: string
  category: string
  description: string | null
  lat: number
  lng: number
  image_url: string | null
  created_at: string
  status: string
}

export type MunicipalityForEmail = {
  id: string
  name_el: string
  email_official: string
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:${MUTED};font-size:13px;white-space:nowrap;vertical-align:top;width:140px">${label}</td>
      <td style="padding:6px 0;color:${TEXT};font-size:14px;vertical-align:top">${value}</td>
    </tr>`
}

/**
 * Builds the Greek-language notification email sent to a municipality
 * when a report is forwarded to them.
 *
 * Returns { subject, html } — pass directly to sendEmail().
 */
export function buildMunicipalityReportEmail(
  report: ReportForEmail,
  municipality: MunicipalityForEmail,
): { subject: string; html: string } {
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://greececlean.vercel.app'
  const reportUrl   = `${appUrl}/r/${report.public_token}`
  const mapsUrl     = `https://www.google.com/maps?q=${report.lat},${report.lng}`
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category
  const submittedDate = new Date(report.created_at).toLocaleDateString('el-GR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const subject = `Νέα Αναφορά Απορριμμάτων — ${municipality.name_el}`

  const html = `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG}">
    <tr>
      <td align="center" style="padding:32px 16px">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background-color:${CARD_BG};border-radius:12px;border:1px solid ${BORDER};overflow:hidden">

          <!-- Header bar -->
          <tr>
            <td style="background-color:${ACCENT};padding:20px 32px">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:22px;line-height:1">🌿</td>
                  <td style="padding-left:10px;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:-0.3px">
                    GreeceClean
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">

              <p style="margin:0 0 6px;font-size:13px;color:${ACCENT};font-weight:bold;text-transform:uppercase;letter-spacing:0.5px">
                Νέα αναφορά
              </p>
              <h1 style="margin:0 0 8px;font-size:22px;color:${TEXT};line-height:1.3">
                ${categoryLabel}
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:${MUTED}">
                Η ακόλουθη αναφορά αφορά την περιοχή αρμοδιότητάς σας και χρειάζεται διεκπεραίωση.
              </p>

              <!-- Details table -->
              <table cellpadding="0" cellspacing="0" width="100%"
                     style="border-top:1px solid ${BORDER};margin-bottom:24px">
                <tbody>
                  ${row('Δήμος:', municipality.name_el)}
                  ${row('Κατηγορία:', categoryLabel)}
                  ${row('Ημερομηνία:', submittedDate)}
                  ${report.description
                    ? row('Περιγραφή:', `<em style="color:${TEXT}">${escapeHtml(report.description)}</em>`)
                    : ''}
                  ${row('Συντεταγμένες:',
                    `<a href="${mapsUrl}" style="color:${ACCENT};text-decoration:none">
                      ${report.lat.toFixed(5)}, ${report.lng.toFixed(5)} — Άνοιγμα στο Google Maps
                    </a>`)}
                </tbody>
              </table>

              <!-- Photo -->
              ${report.image_url ? `
              <p style="margin:0 0 8px;font-size:13px;color:${MUTED};font-weight:bold">ΦΩΤΟΓΡΑΦΙΑ</p>
              <a href="${report.image_url}" style="display:block;margin-bottom:28px">
                <img src="${report.image_url}"
                     alt="Φωτογραφία αναφοράς"
                     width="536"
                     style="max-width:100%;border-radius:8px;border:1px solid ${BORDER};display:block" />
              </a>` : ''}

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px">
                <tr>
                  <td style="background-color:${ACCENT};border-radius:8px">
                    <a href="${reportUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;letter-spacing:-0.2px">
                      Προβολή Αναφοράς →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:${MUTED};word-break:break-all">
                Ή ανοίξτε απευθείας:
                <a href="${reportUrl}" style="color:${ACCENT}">${reportUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${BG};border-top:1px solid ${BORDER};padding:20px 32px;text-align:center">
              <p style="margin:0;font-size:12px;color:${MUTED}">
                Αυτό το email στάλθηκε αυτόματα από το
                <a href="${appUrl}" style="color:${ACCENT};text-decoration:none">GreeceClean</a>.
                Αν δεν αφορά τον δήμο σας, παρακαλούμε αγνοήστε το.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html }
}

/** Minimal HTML escaping for user-supplied text inserted into the email. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
