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
  description: string | null
  municipality: { name_el: string } | null
}

type Mode = 'pending' | 'approved' | 'rejected'

const CATEGORIES: Record<string, string> = {
  illegal_dump:      'Παράνομη Χωματερή',
  roadside_litter:   'Σκουπίδια στο Δρόμο',
  abandoned_vehicle: 'Εγκαταλελειμμένο Όχημα',
  vandalism:         'Βανδαλισμός',
  other:             'Άλλο',
}

const STATUSES: Record<string, string> = {
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

const EMPTY_MESSAGES: Record<Mode, string> = {
  pending:  'Δεν υπάρχουν αναφορές προς έγκριση',
  approved: 'Δεν υπάρχουν εγκεκριμένες αναφορές',
  rejected: 'Δεν υπάρχουν απορριφθείσες αναφορές',
}

export default function AdminReportList({
  reports,
  mode = 'pending',
}: {
  reports: AdminReport[]
  mode?: Mode
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ category: string; status: string }>({
    category: '',
    status: '',
  })

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

  function startEdit(r: AdminReport) {
    setEditingId(r.id)
    setEditDraft({ category: r.category, status: r.status })
  }

  async function saveEdit(id: string) {
    await runAction(id, 'PATCH', { action: 'edit', ...editDraft })
    setEditingId(null)
  }

  if (reports.length === 0) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-medium">{EMPTY_MESSAGES[mode]}</p>
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
          <tbody className="divide-y divide-gray-100">
            {reports.map((r) => (
              <>
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
                  <td className="px-4 py-3 text-gray-600">
                    <div>{CATEGORIES[r.category] ?? r.category}</div>
                    {r.description && (
                      <div className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate" title={r.description}>
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUSES[r.status] ?? r.status}
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

                      {mode === 'pending' && (
                        <>
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
                            onClick={() => runAction(r.id, 'PATCH', { action: 'reject' })}
                            className="text-xs text-orange-500 font-semibold hover:underline"
                          >
                            Απόρριψη
                          </button>
                        </>
                      )}

                      {mode === 'approved' && (
                        <>
                          <button
                            onClick={() => runAction(r.id, 'PATCH', { action: 'deactivate' })}
                            className="text-xs text-orange-500 font-semibold hover:underline"
                          >
                            Απενεργοποίηση
                          </button>
                          <button
                            onClick={() => editingId === r.id ? setEditingId(null) : startEdit(r)}
                            className="text-xs text-blue-600 font-semibold hover:underline"
                          >
                            {editingId === r.id ? 'Ακύρωση' : 'Επεξεργασία'}
                          </button>
                        </>
                      )}

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

                {mode === 'approved' && editingId === r.id && (
                  <tr key={`${r.id}-edit`} className="bg-blue-50 border-t border-blue-100">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="flex flex-wrap gap-4 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Κατηγορία
                          </label>
                          <select
                            value={editDraft.category}
                            onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {Object.entries(CATEGORIES).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Κατάσταση
                          </label>
                          <select
                            value={editDraft.status}
                            onChange={(e) => setEditDraft((d) => ({ ...d, status: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {Object.entries(STATUSES).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => saveEdit(r.id)}
                          disabled={loadingId === r.id}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                          Αποθήκευση
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                        >
                          Ακύρωση
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
