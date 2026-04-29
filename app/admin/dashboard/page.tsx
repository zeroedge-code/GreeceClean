import type { Metadata } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import AdminReportList, { type AdminReport } from '@/components/AdminReportList'

export const metadata: Metadata = {
  title: 'Admin Dashboard – GreeceClean',
}


async function getPendingReports(): Promise<AdminReport[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabaseAdmin
    .from('reports')
    .select('id, public_token, image_url, lat, lng, category, status, is_approved, created_at, municipality:municipality_id(name_el)')
    .eq('is_approved', false)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as AdminReport[]
}

async function getApprovedReports(): Promise<AdminReport[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabaseAdmin
    .from('reports')
    .select('id, public_token, image_url, lat, lng, category, status, is_approved, created_at, municipality:municipality_id(name_el)')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []) as unknown as AdminReport[]
}

async function getRejectedReports(): Promise<AdminReport[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabaseAdmin
    .from('reports')
    .select('id, public_token, image_url, lat, lng, category, status, is_approved, created_at, municipality:municipality_id(name_el)')
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as unknown as AdminReport[]
}

export default async function AdminDashboard() {
  const [pending, approved, rejected] = await Promise.all([
    getPendingReports(),
    getApprovedReports(),
    getRejectedReports(),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Πίνακας Διαχείρισης</h1>
            <p className="text-sm text-gray-500 mt-1">Διαχείριση αναφορών χρηστών</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border hover:bg-gray-50"
            >
              Αποσύνδεση
            </button>
          </form>
        </div>

        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Αναμένουν έγκριση</h2>
            <span className="text-xs text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">
              {pending.length}
            </span>
          </div>
          <AdminReportList reports={pending} mode="pending" />
        </section>

        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Εγκεκριμένες</h2>
            <span className="text-xs text-green-800 bg-green-100 px-2 py-0.5 rounded-full font-medium">
              {approved.length}
            </span>
          </div>
          <AdminReportList reports={approved} mode="approved" />
        </section>

        {rejected.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Απορριφθείσες</h2>
              <span className="text-xs text-red-800 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                {rejected.length}
              </span>
            </div>
            <AdminReportList reports={rejected} mode="rejected" />
          </section>
        )}
      </div>
    </div>
  )
}
