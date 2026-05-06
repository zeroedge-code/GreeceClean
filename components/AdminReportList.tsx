'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateReportPriority } from '@/lib/priority'
import CategoryBadge from '@/components/CategoryBadge'

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
  municipality_id: string | null
  municipality: { name_el: string } | null
}

export type Municipality = {
  id: string
  name_el: string
}

type Mode = 'pending' | 'approved' | 'rejected'

type EditDraft = {
  category: string
  status: string
  municipality_id: string
  description: string
}

const CATEGORIES: Record<string, string> = {
  illegal_dump:        'Παράνομη Χωματερή',
  construction_debris: 'Μπάζα & Οικοδομικά',
  roadside_litter:     'Σκουπίδια',
  plastics:            'Πλαστικά',
  tires:               'Ελαστικά',
  appliances:          'Λευκές Συσκευές',
  abandoned_vehicle:   'Εγκαταλελειμμένο Όχημα',
  green_waste:         'Κλαδιά & Βλάστηση',
  bulky_items:         'Ογκώδη Αντικείμενα',
  coastal_pollution:   'Ρύπανση Ακτής',
  sewage:              'Λύματα & Χημικά',
  other:               'Άλλο',
  vandalism:           'Βανδαλισμός',
}

function PriorityBadge({ category, createdAt }: { category: string; createdAt: string }) {
  const priority = calculateReportPriority(category, new Date(createdAt))
  if (priority === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        Επείγον
      </span>
    )
  }
  if (priority === 'medium') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Μέτρια</span>
    )
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Κανονική</span>
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

const SELECT_CLS = 'border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white'

export default function AdminReportList({
  reports,
  municipalities = [],
  mode = 'pending',
}: {
  reports: AdminReport[]
  municipalities?: Municipality[]
  mode?: Mode
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({
    category: '',
    status: '',
    municipality_id: '',
    description: '',
  })

  async function runAction(id: string, method: 'PATCH' | 'DELETE', body?: object) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/admin/report/${id}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        alert(`Σφάλμα: ${data.error ?? `HTTP ${res.status}`}`)
        return
      }
      router.refresh()
    } catch {
      alert('Σφάλμα δικτύου. Δοκιμάστε ξανά.')
    } finally {
      setLoadingId(null)
    }
  }

  function startEdit(r: AdminReport) {
    setEditingId(r.id)
    setEditDraft({
      category:        r.category,
      status:          r.status,
      municipality_id: r.municipality_id ?? '',
      description:     r.description ?? '',
    })
  }

  async function forwardReport(r: AdminReport) {
    const muniName = r.municipality?.name_el ?? 'τον δήμο'
    if (!confirm(`Αποστολή email ειδοποίησης στον "${muniName}";`)) return
    setLoadingId(r.id)
    try {
      const res = await fetch(`/api/admin/report/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forward' }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; warning?: string }
      if (!res.ok && res.status !== 207) {
        alert(`Σφάλμα: ${data.error ?? 'Αποτυχία αποστολής'}`)
        return
      }
      if (data.warning) alert(`⚠ ${data.warning}`)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function saveEdit(id: string) {
    await runAction(id, 'PATCH', {
      action:          'edit',
      category:        editDraft.category,
      status:          editDraft.status,
      municipality_id: editDraft.municipality_id || null,
      description:     editDraft.description || null,
    })
    setEditingId(null)
  }

  function set<K extends keyof EditDraft>(key: K) {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditDraft((d) => ({ ...d, [key]: e.target.value }))
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
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Προτεραιότητα</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Κατάσταση</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ημερομηνία</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ενέργειες</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((r) => (
              <Fragment key={r.id}>
                <tr
                  className={`hover:bg-gray-50 transition-colors ${loadingId === r.id ? 'opacity-50 pointer-events-none' : ''} ${calculateReportPriority(r.category, new Date(r.created_at)) === 'urgent' ? 'bg-red-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xl">📷</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.public_token}</td>
                  <td className="px-4 py-3 text-gray-800">{r.municipality?.name_el ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <CategoryBadge
                      categoryId={r.category}
                      label={CATEGORIES[r.category] ?? r.category}
                      size="sm"
                    />
                    {r.description && (
                      <div className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate" title={r.description}>
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge category={r.category} createdAt={r.created_at} />
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

                      {/* Edit button — available in all modes */}
                      <button
                        onClick={() => editingId === r.id ? setEditingId(null) : startEdit(r)}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        {editingId === r.id ? 'Ακύρωση' : 'Επεξεργασία'}
                      </button>

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
                          {r.municipality_id && r.status !== 'forwarded' && (
                            <button
                              onClick={() => forwardReport(r)}
                              className="text-xs text-purple-600 font-semibold hover:underline"
                            >
                              📨 Προώθηση
                            </button>
                          )}
                          <button
                            onClick={() => runAction(r.id, 'PATCH', { action: 'deactivate' })}
                            className="text-xs text-orange-500 font-semibold hover:underline"
                          >
                            Απενεργοποίηση
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

                {/* ── Inline edit row ── */}
                {editingId === r.id && (
                  <tr className="bg-blue-50 border-t border-blue-100">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Κατηγορία</label>
                          <select value={editDraft.category} onChange={set('category')} className={SELECT_CLS}>
                            {Object.entries(CATEGORIES).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Κατάσταση</label>
                          <select value={editDraft.status} onChange={set('status')} className={SELECT_CLS}>
                            {Object.entries(STATUSES).map(([v, l]) => (
                              <option key={v} value={v}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Δήμος</label>
                          <select value={editDraft.municipality_id} onChange={set('municipality_id')} className={`${SELECT_CLS} w-full`}>
                            <option value="">— Άγνωστος —</option>
                            {municipalities
                              .slice()
                              .sort((a, b) => a.name_el.localeCompare(b.name_el, 'el'))
                              .map((m) => (
                                <option key={m.id} value={m.id}>{m.name_el}</option>
                              ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Σχόλιο χρήστη
                          </label>
                          <textarea
                            value={editDraft.description}
                            onChange={set('description')}
                            rows={3}
                            maxLength={500}
                            className={`${SELECT_CLS} w-full resize-none`}
                            placeholder="Κενό = χωρίς σχόλιο"
                          />
                          <p className="text-right text-xs text-gray-400 mt-0.5">{editDraft.description.length}/500</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
