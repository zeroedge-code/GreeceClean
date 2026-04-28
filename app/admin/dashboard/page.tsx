import type { Metadata } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import AdminReportList, { type AdminReport } from '@/components/AdminReportList'

export const metadata: Metadata = {
  title: 'Admin Dashboard – GreeceClean',
}

// TODO: Protect this route with auth middleware (Supabase session check in middleware.ts)

async function getUnapprovedReports(): Promise<AdminReport[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabaseAdmin
    .from('reports')
    .select('id, public_token, image_url, lat, lng, category, status, is_approved, created_at, municipality:municipality_id(name_el)')
    .eq('is_approved', false)
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as AdminReport[]
}

export default async function AdminDashboard() {
  const reports = await getUnapprovedReports()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Πίνακας Διαχείρισης</h1>
            <p className="text-sm text-gray-500 mt-1">Αναφορές που αναμένουν έγκριση</p>
          </div>
          <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border">
            {reports.length} αναφορές
          </span>
        </div>

        <AdminReportList reports={reports} />
      </div>
    </div>
  )
}
