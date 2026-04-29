import type { Metadata } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { SEED_REPORTS } from '@/lib/seed-data'

export const metadata: Metadata = {
  title: 'Παρακολούθηση Αναφοράς – GreeceClean',
}

const CATEGORY_LABELS: Record<string, string> = {
  illegal_dump:      'Παράνομη Χωματερή',
  roadside_litter:   'Σκουπίδια στο Δρόμο',
  abandoned_vehicle: 'Εγκαταλελειμμένο Όχημα',
  vandalism:         'Βανδαλισμός',
  other:             'Άλλο',
}

// Public-facing 4-step progress — maps each step to the DB statuses that satisfy it
const STEPS = [
  { label: 'Υποβλήθηκε',   done: (_: string) => true },
  { label: 'Επαληθεύτηκε', done: (s: string) => ['in_review', 'forwarded', 'resolved'].includes(s) },
  { label: 'Ειδοποιήθηκε', done: (s: string) => ['forwarded', 'resolved'].includes(s) },
  { label: 'Καθαρίστηκε',  done: (s: string) => s === 'resolved' },
]

type Report = {
  public_token: string
  status: string
  image_url: string | null
  lat: number
  lng: number
  category: string
  created_at: string
  description?: string | null
  municipality: { name_el: string } | null
}

async function getReport(token: string): Promise<Report | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabaseAdmin
      .from('reports')
      .select('public_token, status, image_url, lat, lng, category, created_at, description, municipality:municipality_id(name_el)')
      .eq('public_token', token)
      .single()
    if (data) return data as unknown as Report
  }
  // Fall back to seed data (used when Supabase is not yet configured)
  return SEED_REPORTS.find((r) => r.public_token === token) ?? null
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const report = await getReport(token)

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-primary mb-2">Αναφορά δεν βρέθηκε</h1>
          <p className="text-gray-500 text-sm">
            Το link παρακολούθησης δεν αντιστοιχεί σε καμία αναφορά.
          </p>
        </div>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://greececlean.gr'
  const trackingUrl = `${appUrl}/r/${report.public_token}`
  const whatsappText = encodeURIComponent(`Δες αυτή την αναφορά ρύπανσης στο GreeceClean:\n${trackingUrl}`)
  const isRejected = report.status === 'rejected'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-primary">Κατάσταση Αναφοράς</h1>

        {/* Photo + details */}
        <div className="card">
          {report.image_url && (
            <img
              src={report.image_url}
              alt="Φωτογραφία αναφοράς"
              className="w-full rounded-2xl object-cover max-h-64 mb-4"
            />
          )}
          <dl className="text-sm text-gray-600 space-y-1.5">
            <div className="flex gap-2">
              <dt className="font-medium shrink-0">Token:</dt>
              <dd className="font-mono text-xs text-gray-400 break-all">{report.public_token}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium shrink-0">Κατηγορία:</dt>
              <dd>{CATEGORY_LABELS[report.category] ?? report.category}</dd>
            </div>
            {report.municipality && (
              <div className="flex gap-2">
                <dt className="font-medium shrink-0">Δήμος:</dt>
                <dd>{report.municipality.name_el}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-medium shrink-0">Συντεταγμένες:</dt>
              <dd className="font-mono text-xs">{report.lat.toFixed(5)}, {report.lng.toFixed(5)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium shrink-0">Υποβλήθηκε:</dt>
              <dd>{new Date(report.created_at).toLocaleDateString('el-GR')}</dd>
            </div>
            {report.description && (
              <div className="pt-2 border-t border-gray-100 mt-2">
                <dt className="font-medium text-gray-700 mb-1">Περιγραφή:</dt>
                <dd className="text-gray-600 leading-relaxed">{report.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Rejected state */}
        {isRejected && (
          <div className="card bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm font-medium">
              ❌ Η αναφορά απορρίφθηκε. Αν πιστεύεις ότι υπήρξε λάθος, υπόβαλε νέα αναφορά.
            </p>
          </div>
        )}

        {/* 4-step progress stepper */}
        {!isRejected && (
          <div className="card">
            <h2 className="font-semibold text-primary mb-6">Πρόοδος</h2>
            <ol className="relative ml-3 space-y-0">
              {STEPS.map((step, i) => {
                const done = step.done(report.status)
                const isLast = i === STEPS.length - 1
                return (
                  <li key={step.label} className={`relative flex gap-4 ${!isLast ? 'pb-7' : ''}`}>
                    {/* Vertical connector line */}
                    {!isLast && (
                      <span
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 -translate-x-1/2 ${
                          done ? 'bg-action' : 'bg-gray-200'
                        }`}
                      />
                    )}
                    {/* Step circle */}
                    <span
                      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        done
                          ? 'bg-action border-action text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={`pt-0.5 text-sm font-medium ${done ? 'text-gray-800' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* Share */}
        <div className="card">
          <p className="text-sm font-medium text-gray-600 mb-3">Κοινοποίηση</p>
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Κοινοποίηση στο WhatsApp
            </a>
            <a
              href={trackingUrl}
              className="text-center text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
            >
              {trackingUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
