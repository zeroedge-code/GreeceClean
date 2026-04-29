import Link from 'next/link'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { SEED_REPORTS } from '@/lib/seed-data'

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
  const [{ count: total }, { count: resolved }, { count: municipalities }] = await Promise.all([
    supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('is_approved', true),
    supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved').eq('is_approved', true),
    supabaseAdmin.from('municipalities').select('*', { count: 'exact', head: true }),
  ])
  return { total: total ?? 0, resolved: resolved ?? 0, municipalities: municipalities ?? 0 }
}

async function getLeaderboard(): Promise<{ champions: MunicipalityStat[]; needsWork: MunicipalityStat[] }> {
  if (!isSupabaseConfigured) return { champions: [], needsWork: [] }

  const { data } = await supabaseAdmin
    .from('reports')
    .select('status, municipality:municipality_id(name_el)')
    .eq('is_approved', true)
    .not('municipality_id', 'is', null)

  if (!data || data.length === 0) return { champions: [], needsWork: [] }

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

function MunicipalityRow({ stat, showRate }: { stat: MunicipalityStat; showRate: boolean }) {
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
        <p className="text-xs text-gray-400">{showRate ? `${stat.resolved}/${stat.total}` : 'εκκρεμείς'}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  { icon: '🏗️', label: 'Μπάζα' },
  { icon: '🛞', label: 'Ελαστικά' },
  { icon: '🔌', label: 'Ηλεκτρικά' },
  { icon: '🧴', label: 'Πλαστικά' },
  { icon: '🚗', label: 'Εγκαταλ. Οχήματα' },
  { icon: '🚮', label: 'Σκουπίδια' },
]

export default async function LandingPage() {
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
            Κρατήστε την Ελλάδα <span className="text-action-300">Καθαρή</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Φωτογραφίστε παράνομες χωματερές και σκουπίδια. Τα αναφέρουμε αυτόματα στον
            αρμόδιο δήμο.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/report" className="btn-action text-center text-base px-8 py-3.5 shadow-lg">
              📷 Κάνε Αναφορά
            </Link>
            <Link href="/map" className="btn-primary bg-white/10 hover:bg-white/20 border border-white/30 text-center text-base px-8 py-3.5">
              🗺️ Δες τον Χάρτη
            </Link>
          </div>
        </div>
      </section>

      {/* What can be reported */}
      <section className="py-10 px-4 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-5">
            Τι μπορείς να αναφέρεις
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {REPORT_TYPES.map(({ icon, label }) => (
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
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            Πώς λειτουργεί
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Φωτογράφισε', desc: 'Τράβα φωτογραφία του προβλήματος μέσα από την εφαρμογή.' },
              { step: '02', title: 'Στείλε Αναφορά', desc: 'Η τοποθεσία καταγράφεται αυτόματα και η αναφορά αποστέλλεται.' },
              { step: '03', title: 'Παρακολούθησε', desc: 'Λαμβάνεις link παρακολούθησης για να δεις την πρόοδο.' },
            ].map(({ step, title, desc }) => (
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
          <StatCard value={stats.total} label="Αναφορές" />
          <StatCard value={stats.resolved} label="Καθαρίστηκαν" />
          <StatCard value={stats.municipalities} label="Δήμοι" />
        </div>
      </section>

      {/* Impact leaderboard */}
      {(champions.length > 0 || needsWork.length > 0) && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-primary mb-2">Impact Dashboard</h2>
              <p className="text-gray-500 text-sm">Ποιοι δήμοι δρουν — και ποιοι όχι ακόμα</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Champions */}
              {champions.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-primary mb-1">🏆 Πρωταθλητές Καθαριότητας</h3>
                  <p className="text-xs text-gray-400 mb-5">Υψηλότερο ποσοστό επιλυμένων αναφορών</p>
                  <div className="space-y-4">
                    {champions.map((s) => (
                      <MunicipalityRow key={s.name} stat={s} showRate />
                    ))}
                  </div>
                </div>
              )}

              {/* Needs work */}
              {needsWork.length > 0 && (
                <div className="card">
                  <h3 className="font-bold text-primary mb-1">⚠️ Περιθώριο Βελτίωσης</h3>
                  <p className="text-xs text-gray-400 mb-5">Περισσότερες εκκρεμείς αναφορές</p>
                  <div className="space-y-4">
                    {needsWork.map((s) => (
                      <MunicipalityRow key={s.name} stat={s} showRate={false} />
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
        <p className="text-xs text-primary-200 mt-1">Για μια καθαρή Ελλάδα 🌿</p>
        <div className="flex justify-center gap-6 mt-4 text-xs text-primary-300">
          <Link href="/report" className="hover:text-white transition-colors">Αναφορά</Link>
          <Link href="/map" className="hover:text-white transition-colors">Χάρτης</Link>
        </div>
      </footer>
    </div>
  )
}
