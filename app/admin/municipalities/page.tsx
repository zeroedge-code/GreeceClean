import type { Metadata } from 'next'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import MunicipalityEmailList, { type MunicipalityRow } from '@/components/MunicipalityEmailList'

export const metadata: Metadata = {
  title: 'Δήμοι & Email – GreeceClean Admin',
}

export const dynamic = 'force-dynamic'

async function getMunicipalities(): Promise<MunicipalityRow[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabaseAdmin
    .from('municipalities')
    .select('id, name_el, name_en, email_official, region')
    .order('name_el')
  return (data ?? []) as MunicipalityRow[]
}

export default async function MunicipalitiesAdminPage() {
  const municipalities = await getMunicipalities()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header — same chrome as the dashboard */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Δήμοι & Email</h1>
            <p className="text-sm text-gray-500 mt-1">
              Διαχείριση email επικοινωνίας για αυτόματες ειδοποιήσεις αναφορών
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/dashboard"
              className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border hover:bg-gray-50"
            >
              ← Dashboard
            </a>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border hover:bg-gray-50"
              >
                Αποσύνδεση
              </button>
            </form>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 mb-6 text-sm text-blue-800">
          <strong>Πώς λειτουργεί:</strong> Όταν μια αναφορά λάβει κατάσταση
          <span className="font-mono bg-blue-100 px-1 rounded mx-1">forwarded</span>
          αποστέλλεται αυτόματα email στο email_official του αντίστοιχου δήμου.
          Βεβαιωθείτε ότι κάθε δήμος έχει ορισμένη έγκυρη διεύθυνση.
        </div>

        <MunicipalityEmailList municipalities={municipalities} />
      </div>
    </div>
  )
}
