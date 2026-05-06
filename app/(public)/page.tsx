import Link from 'next/link'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { SEED_REPORTS } from '@/lib/seed-data'
import { getLocale, getDictionary } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

// ─── Data fetching ────────────────────────────────────────────────────────────

type MunicipalityStat = {
  name: string
  total: number
  resolved: number
  rate: number
  unresolved: number
}

async function getStats() {
  if (!isSupabaseConfigured) {
    const resolved = SEED_REPORTS.filter((r) => r.status === 'resolved').length
    return { total: SEED_REPORTS.length, resolved, municipalities: 14 }
  }
  try {
    const [{ count: total }, { count: resolved }, { count: municipalities }] = await Promise.all([
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('is_approved', true),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved').eq('is_approved', true),
      supabaseAdmin.from('municipalities').select('*', { count: 'exact', head: true }),
    ])
    return { total: total ?? 0, resolved: resolved ?? 0, municipalities: municipalities ?? 0 }
  } catch {
    return { total: 0, resolved: 0, municipalities: 0 }
  }
}

async function getLeaderboard(): Promise<{ champions: MunicipalityStat[]; needsWork: MunicipalityStat[] }> {
  if (!isSupabaseConfigured) return { champions: [], needsWork: [] }

  let data: unknown[]
  try {
    const result = await supabaseAdmin
      .from('reports')
      .select('status, municipality:municipality_id(name_el)')
      .eq('is_approved', true)
      .not('municipality_id', 'is', null)
    data = result.data ?? []
  } catch {
    return { champions: [], needsWork: [] }
  }

  if (data.length === 0) return { champions: [], needsWork: [] }

  const map = new Map<string, { total: number; resolved: number }>()
  for (const r of data as unknown as { status: string; municipality: { name_el: string } | null }[]) {
    const name = r.municipality?.name_el
    if (!name) continue
    const s = map.get(name) ?? { total: 0, resolved: 0 }
    s.total++
    if (r.status === 'resolved') s.resolved++
    map.set(name, s)
  }

  const stats: MunicipalityStat[] = Array.from(map.entries()).map(([name, s]) => ({
    name,
    total: s.total,
    resolved: s.resolved,
    rate: s.resolved / s.total,
    unresolved: s.total - s.resolved,
  }))

  const champions = [...stats]
    .filter((s) => s.resolved > 0)
    .sort((a, b) => b.rate - a.rate || b.resolved - a.resolved)
    .slice(0, 8)

  const needsWork = [...stats]
    .filter((s) => s.unresolved > 0)
    .sort((a, b) => b.unresolved - a.unresolved)
    .slice(0, 8)

  return { champions, needsWork }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card text-center">
      <div className="text-3xl font-extrabold text-primary">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function MunicipalityRow({
  stat,
  showRate,
  unresolvedLabel,
}: {
  stat: MunicipalityStat
  showRate: boolean
  unresolvedLabel: string
}) {
  const pct = Math.round(stat.rate * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{stat.name}</p>
        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${showRate ? 'bg-action' : 'bg-orange-400'}`}
            style={{ width: showRate ? `${pct}%` : `${Math.min(100, stat.unresolved * 10)}%` }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right">
        {showRate ? (
          <span className="text-sm font-bold text-action">{pct}%</span>
        ) : (
          <span className="text-sm font-bold text-orange-500">{stat.unresolved}</span>
        )}
        <p className="text-xs text-gray-400">
          {showRate ? `${stat.resolved}/${stat.total}` : unresolvedLabel}
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const locale = await getLocale()
  const t = getDictionary(locale)
  const l = t.landing

  const [stats, { champions, needsWork }] = await Promise.all([
    getStats(),
    getLeaderboard(),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            {l.heroTitle} <span className="text-action-300">{l.heroHighlight}</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            {l.heroDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/report" className="btn-action text-center text-base px-8 py-3.5 shadow-lg">
              {l.ctaPrimary}
            </Link>
            <Link href="/map" className="btn-primary bg-white/10 hover:bg-white/20 border border-white/30 text-center text-base px-8 py-3.5">
              {l.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* What can be reported */}
      <section className="py-10 px-4 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-5">
            {l.whatToReport}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {l.reportTypes.map(({ icon, label }) => (
              <Link
                key={label}
                href="/report"
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-gray-50 transition-colors group"
              >
                <span className="text-3xl leading-none group-hover:scale-110 transition-transform">{icon}</span>
                <span className="text-xs text-gray-600 font-medium text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">{l.howItWorksTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {l.howSteps.map(({ step, title, desc }) => (
              <div key={step} className="card text-center">
                <div className="text-4xl font-extrabold text-action mb-3">{step}</div>
                <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
          <StatCard value={stats.total}           label={l.statsReports} />
          <StatCard value={stats.resolved}         label={l.statsCleaned} />
          <StatCard value={stats.municipalities}   label={l.statsMunicipalities} />
        </div>
      </section>

      {/* Impact leaderboard */}
      {(champions.length > 0 || needsWork.length > 0) && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-primary mb-2">{l.impactTitle}</h2>
              <p className="text-gray-500 text-sm">{l.impactSubtitle}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {champions.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-primary mb-1">{l.championsTitle}</h3>
                  <p className="text-xs text-gray-400 mb-5">{l.championsSubtitle}</p>
                  <div className="space-y-4">
                    {champions.map((s) => (
                      <MunicipalityRow key={s.name} stat={s} showRate unresolvedLabel={l.unresolvedLabel} />
                    ))}
                  </div>
                </div>
              )}
              {needsWork.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-primary mb-1">{l.needsWorkTitle}</h3>
                  <p className="text-xs text-gray-400 mb-5">{l.needsWorkSubtitle}</p>
                  <div className="space-y-4">
                    {needsWork.map((s) => (
                      <MunicipalityRow key={s.name} stat={s} showRate={false} unresolvedLabel={l.unresolvedLabel} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 bg-primary text-white text-center">
        <p className="text-sm font-medium">GreeceClean 2026</p>
        <p className="text-xs text-primary-200 mt-1">{l.footerTagline}</p>
        <div className="flex justify-center gap-6 mt-4 text-xs text-primary-300">
          <Link href="/report" className="hover:text-white transition-colors">{t.nav.report}</Link>
          <Link href="/map" className="hover:text-white transition-colors">{t.nav.map}</Link>
        </div>
      </footer>
    </div>
  )
}
