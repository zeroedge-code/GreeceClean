'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type MunicipalityRow = {
  id: string
  name_el: string
  name_en: string
  email_official: string | null
  region: string | null
}

type EditDraft = { email_official: string; region: string }

const INPUT_CLS =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary bg-white'

function statusDot(email: string | null) {
  if (!email) return <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="Χωρίς email" />
  return <span className="inline-block w-2 h-2 rounded-full bg-action" title="Έχει email" />
}

export default function MunicipalityEmailList({
  municipalities,
}: {
  municipalities: MunicipalityRow[]
}) {
  const router  = useRouter()
  const [editId, setEditId]     = useState<string | null>(null)
  const [draft,  setDraft]      = useState<EditDraft>({ email_official: '', region: '' })
  const [saving, setSaving]     = useState(false)
  const [error,  setError]      = useState<string | null>(null)

  function startEdit(m: MunicipalityRow) {
    setEditId(m.id)
    setDraft({ email_official: m.email_official ?? '', region: m.region ?? '' })
    setError(null)
  }

  async function save(id: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/municipalities/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email_official: draft.email_official,
          region:         draft.region,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setEditId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Σφάλμα αποθήκευσης')
    } finally {
      setSaving(false)
    }
  }

  const withEmail    = municipalities.filter((m) => m.email_official).length
  const withoutEmail = municipalities.length - withEmail

  return (
    <div>
      {/* Summary stats */}
      <div className="flex gap-4 mb-6 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-action" />
          <strong>{withEmail}</strong> με email
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
          <strong>{withoutEmail}</strong> χωρίς email
        </span>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-6"></th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Δήμος</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Περιφέρεια</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email επικοινωνίας</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {municipalities.map((m) => (
                <>
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">{statusDot(m.email_official)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{m.name_el}</td>
                    <td className="px-4 py-3 text-gray-500">{m.region ?? '—'}</td>
                    <td className="px-4 py-3">
                      {m.email_official
                        ? <a href={`mailto:${m.email_official}`}
                             className="text-primary hover:underline font-mono text-xs">
                            {m.email_official}
                          </a>
                        : <span className="text-gray-300 italic text-xs">Δεν έχει οριστεί</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => editId === m.id ? setEditId(null) : startEdit(m)}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        {editId === m.id ? 'Ακύρωση' : 'Επεξεργασία'}
                      </button>
                    </td>
                  </tr>

                  {/* Inline edit row */}
                  {editId === m.id && (
                    <tr key={`${m.id}-edit`} className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 max-w-2xl">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Email επικοινωνίας
                            </label>
                            <input
                              type="email"
                              value={draft.email_official}
                              onChange={(e) => setDraft((d) => ({ ...d, email_official: e.target.value }))}
                              className={INPUT_CLS}
                              placeholder="info@municipality.gr"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Περιφέρεια
                            </label>
                            <input
                              type="text"
                              value={draft.region}
                              onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))}
                              className={INPUT_CLS}
                              placeholder="π.χ. Αττική"
                            />
                          </div>
                        </div>
                        {error && <p className="text-red-500 text-xs mb-2">⚠ {error}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={() => save(m.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                          >
                            {saving ? 'Αποθήκευση…' : 'Αποθήκευση'}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
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
    </div>
  )
}
