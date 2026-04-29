import type { Metadata } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { SEED_REPORTS } from '@/lib/seed-data'
import { getLocale, getDictionary } from '@/lib/i18n'
import CopyButton from '@/components/CopyButton'

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
  return SEED_REPORTS.find((r) => r.public_token === token) ?? null
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://greececlean.gr'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const [report, locale] = await Promise.all([getReport(token), getLocale()])
  const t = getDictionary(locale)

  if (!report) {
    return { title: `${t.tracking.notFoundTitle} – GreeceClean` }
  }

  const category = t.tracking.categories[report.category] ?? report.category
  const place    = report.municipality?.name_el ?? 'GreeceClean'
  const title    = `${category} – ${place}`
  const desc     = report.description ?? `${t.tracking.pageTitle} | GreeceClean`
  const url      = `${appUrl()}/r/${token}`

  return {
    title: `${title} | GreeceClean`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url,
      locale: locale === 'el' ? 'el_GR' : locale === 'de' ? 'de_DE' : 'en_GB',
      type: 'website',
      ...(report.image_url && {
        images: [{ url: report.image_url, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: report.image_url ? 'summary_large_image' : 'summary',
      title,
      description: desc,
      ...(report.image_url && { images: [report.image_url] }),
    },
  }
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [report, locale] = await Promise.all([getReport(token), getLocale()])
  const t  = getDictionary(locale)
  const tr = t.tracking

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-primary mb-2">{tr.notFoundTitle}</h1>
          <p className="text-gray-500 text-sm">{tr.notFoundDesc}</p>
        </div>
      </div>
    )
  }

  const trackingUrl  = `${appUrl()}/r/${report.public_token}`
  const whatsappText = encodeURIComponent(tr.whatsappTemplate.replace('{url}', trackingUrl))
  const isRejected   = report.status === 'rejected'

  const bbox = [
    (report.lng - 0.008).toFixed(5),
    (report.lat - 0.006).toFixed(5),
    (report.lng + 0.008).toFixed(5),
    (report.lat + 0.006).toFixed(5),
  ].join('%2C')
  const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${report.lat.toFixed(5)}%2C${report.lng.toFixed(5)}`

  const STEPS = tr.steps.map((label, i) => ({
    label,
    done: [
      () => true,
      (s: string) => ['in_review', 'forwarded', 'resolved'].includes(s),
      (s: string) => ['forwarded', 'resolved'].includes(s),
      (s: string) => s === 'resolved',
    ][i],
  }))

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-primary">{tr.pageTitle}</h1>

        {/* Photo */}
        {report.image_url && (
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <img src={report.image_url} alt={tr.pageTitle} className="w-full object-cover max-h-72" />
          </div>
        )}

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm h-52">
          <iframe title={tr.pageTitle} src={osmSrc} className="w-full h-full border-0" loading="lazy" />
        </div>

        {/* Details */}
        <div className="card">
          <dl className="text-sm text-gray-600 space-y-1.5">
            <div className="flex gap-2">
              <dt className="font-medium shrink-0">{tr.labelCategory}</dt>
              <dd>{tr.categories[report.category] ?? report.category}</dd>
            </div>
            {report.municipality && (
              <div className="flex gap-2">
                <dt className="font-medium shrink-0">{tr.labelMunicipality}</dt>
                <dd>{report.municipality.name_el}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="font-medium shrink-0">{tr.labelSubmitted}</dt>
              <dd>{new Date(report.created_at).toLocaleDateString(locale === 'el' ? 'el-GR' : locale === 'de' ? 'de-DE' : 'en-GB')}</dd>
            </div>
            {report.description && (
              <div className="pt-2 border-t border-gray-100 mt-2">
                <dt className="font-medium text-gray-700 mb-1">{tr.labelDescription}</dt>
                <dd className="text-gray-600 leading-relaxed">{report.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Rejected */}
        {isRejected && (
          <div className="card bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm font-medium">{tr.rejectedMsg}</p>
          </div>
        )}

        {/* Stepper */}
        {!isRejected && (
          <div className="card">
            <h2 className="font-semibold text-primary mb-6">{tr.progressTitle}</h2>
            <ol className="relative ml-3 space-y-0">
              {STEPS.map(({ label, done }, i) => {
                const isDone = done(report.status)
                const isLast = i === STEPS.length - 1
                return (
                  <li key={label} className={`relative flex gap-4 ${!isLast ? 'pb-7' : ''}`}>
                    {!isLast && (
                      <span className={`absolute left-3.5 top-7 bottom-0 w-0.5 -translate-x-1/2 ${isDone ? 'bg-action' : 'bg-gray-200'}`} />
                    )}
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${isDone ? 'bg-action border-action text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                      {isDone ? '✓' : i + 1}
                    </span>
                    <span className={`pt-0.5 text-sm font-medium ${isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* Share */}
        <div className="card">
          <p className="text-sm font-medium text-gray-600 mb-3">{tr.shareTitle}</p>
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
              WhatsApp
            </a>
            <CopyButton url={trackingUrl} />
            <p className="text-center text-xs text-gray-400 break-all">{trackingUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
