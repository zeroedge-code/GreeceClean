'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type AdminReport = {
  id: string
  public_token: string
  image_url: string | null
  lat: number
  lng: number
  category: string
  status: string
  is_approved: boolean
  created_at: string
  municipality: { name_el: string } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  illegal_dump:      'Παράνομη Χωματερή',
  roadside_litter:   'Σκουπίδια στο Δρόμο',
  abandoned_vehicle: 'Εγκαταλελειμμένο Όχημα',
  vandalism:         'Βανδαλισμός',
  other:             'Άλλο',
}

const STATUS_LABELS: Record<string, string> = {
  pending:   'Σε αναμονή',
  in_review: 'Υπό εξέταση',
  forwarded: 'Προωθήθηκε',
  resolved:  'Επιλύθηκε',
  rejected:  'Απορρίφθηκε',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  forwarded: 'bg-purple-100 text-purple-800',
  resolved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
}

export default function AdminReportList({ reports }: { reports: AdminReport[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function runAction(id: string, method: 'PATCH' | 'DELETE', body?: object) {
    setLoadingId(id)
    try {
      await fetch(`/api/admin/report/${id}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  if (reports.length === 0) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-medium">Δεν υπάρχουν αναφορές προς έγκριση</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-16">Εικόνα</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Token</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Δήμος</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Κατηγορία</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Κατάσταση</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ημερομηνία</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reports.map((r) => (
              <tr
                key={r.id}
                className={`hover:bg-gray-50 transition-colors ${loadingId === r.id ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <td className="px-4 py-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xl">
                      📷
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.public_token}</td>
                <td className="px-4 py-3 text-gray-800">{r.municipality?.name_el ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{CATEGORY_LABELS[r.category] ?? r.category}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(r.created_at).toLocaleDateString('el-GR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 items-center flex-wrap">
                    <a
                      href={`/r/${r.public_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Προβολή
                    </a>
                    <button
                      onClick={() => runAction(r.id, 'PATCH', { action: 'approve' })}
                      className="text-xs text-action font-semibold hover:underline"
                    >
                      Έγκριση
                    </button>
                    <button
                      onClick={() => runAction(r.id, 'PATCH', { action: 'mark_cleaned' })}
                      className="text-xs text-purple-600 font-semibold hover:underline"
                    >
                      Καθαρίστηκε
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Διαγραφή αναφοράς ${r.public_token};`)) {
                          runAction(r.id, 'DELETE')
                        }
                      }}
                      className="text-xs text-red-500 font-semibold hover:underline"
                    >
                      Διαγραφή
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
