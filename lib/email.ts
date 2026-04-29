import { Resend } from 'resend'

// Lazily initialised so the module can be imported in environments where
// RESEND_API_KEY is not set (e.g. during static builds) without throwing.
let _resend: Resend | null = null
function getClient(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(key)
  }
  return _resend
}

export type EmailPayload = {
  to: string
  subject: string
  html: string
}

/**
 * Send a single transactional email via Resend.
 * Throws on API error so callers can catch and log to email_logs.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const from = process.env.EMAIL_FROM ?? 'GreeceClean <noreply@greececlean.gr>'
  const { error } = await getClient().emails.send({
    from,
    to:      payload.to,
    subject: payload.subject,
    html:    payload.html,
  })
  if (error) throw new Error(error.message)
}
