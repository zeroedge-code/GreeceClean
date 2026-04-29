import type { Metadata } from 'next'
import { SEED_REPORTS, type SeedReport } from '@/lib/seed-data'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import MapWrapper from '@/components/MapWrapper'

export const metadata: Metadata = {
  title: 'Χάρτης Αναφορών – GreeceClean',
  description: 'Δες όλες τις εγκεκριμένες αναφορές σε διαδραστικό χάρτη.',
}

async function getReports(): Promise<SeedReport[]> {
  if (!isSupabaseConfigured) return SEED_REPORTS

  const { data } = await supabase
    .from('reports')
    .select('public_token, image_url, lat, lng, category, status, created_at, municipality:municipality_id(name_el)')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as unknown as SeedReport[]
  return rows.length > 0 ? rows : SEED_REPORTS
}

export default async function MapPage() {
  const reports = await getReports()
  return (
    <div className="h-[calc(100vh-64px)]">
      <MapWrapper reports={reports} />
    </div>
  )
}
