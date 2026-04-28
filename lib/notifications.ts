const CATEGORY_LABELS: Record<string, string> = {
  illegal_dump:      'Παράνομη Χωματερή',
  roadside_litter:   'Σκουπίδια στο Δρόμο',
  abandoned_vehicle: 'Εγκαταλελειμμένο Όχημα',
  vandalism:         'Βανδαλισμός',
  other:             'Άλλο',
}

export type MunicipalityEmailParams = {
  municipalityName: string
  municipalityEmail: string
  category: string
  trackingUrl: string
  lat: number
  lng: number
  imageUrl: string | null
  reportedAt: Date
}

export function buildMunicipalityEmail(p: MunicipalityEmailParams): {
  to: string
  subject: string
  html: string
} {
  const categoryLabel = CATEGORY_LABELS[p.category] ?? p.category
  const dateStr = p.reportedAt.toLocaleDateString('el-GR', { dateStyle: 'long' })
  const subject = `[GreeceClean] Νέα Αναφορά: ${categoryLabel} – ${p.municipalityName}`

  const html = `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#1f2937">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:#005BAE;padding:24px 32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:.5px">GreeceClean</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.75);font-size:13px">Πλατφόρμα Αναφοράς Ρύπανσης</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 16px">Αγαπητέ/ή <strong>${p.municipalityName}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b5563">
              Μια νέα αναφορά ρύπανσης υποβλήθηκε στην περιοχή δικαιοδοσίας σας μέσω της πλατφόρμας <strong>GreeceClean</strong>.
            </p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px;margin-bottom:24px">
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-weight:bold;border-bottom:1px solid #e5e7eb;width:40%">Κατηγορία</td>
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb">${categoryLabel}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-weight:bold;border-bottom:1px solid #e5e7eb">Δήμος</td>
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb">${p.municipalityName}</td>
              </tr>
              <tr style="background:#f9fafb">
                <td style="padding:10px 16px;font-weight:bold;border-bottom:1px solid #e5e7eb">Συντεταγμένες</td>
                <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:13px">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-weight:bold">Ημερομηνία</td>
                <td style="padding:10px 16px">${dateStr}</td>
              </tr>
            </table>

            ${p.imageUrl ? `
            <!-- Report photo -->
            <div style="text-align:center;margin-bottom:24px">
              <img src="${p.imageUrl}" alt="Φωτογραφία αναφοράς"
                style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb" />
            </div>
            ` : ''}

            <!-- CTA button -->
            <div style="text-align:center;margin-bottom:24px">
              <a href="${p.trackingUrl}"
                style="display:inline-block;background:#005BAE;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
                Προβολή Αναφοράς
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">

            <p style="font-size:12px;color:#9ca3af;margin:0">
              Αυτό το email εστάλη αυτόματα από την πλατφόρμα GreeceClean.
              Για ενημέρωση κατάστασης ή επικοινωνία με τους διαχειριστές,
              επισκεφτείτε τον παραπάνω σύνδεσμο.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { to: p.municipalityEmail, subject, html }
}

// Stub — replace with Resend / SendGrid / SMTP in production.
export async function sendMunicipalityNotification(p: MunicipalityEmailParams): Promise<void> {
  const { to, subject, html } = buildMunicipalityEmail(p)
  console.info('[email-stub] Would send notification:', { to, subject, htmlLength: html.length })
  // TODO: await resend.emails.send({ from: 'noreply@greececlean.gr', to, subject, html })
}
