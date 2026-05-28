import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, Trash2 } from 'lucide-react'
import { listAllTypes } from '../../lib/db/admin/queries'
import { deleteCalendarType } from '../../lib/db/admin/mutations'
import { ErrorState, LoadingState } from '../../components/ui/States'
import type { CalendarTypeRecord } from '../../types'

const COLOR_BADGE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700',
  green: 'bg-emerald-50 text-emerald-700', grey: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-50 text-orange-700', pink: 'bg-pink-50 text-pink-700',
  teal: 'bg-teal-50 text-teal-700',
}

export default function AdminEventTypes() {
  const [types, setTypes] = useState<CalendarTypeRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const next = await listAllTypes()
      setTypes(next)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const filtered = useMemo(() => {
    if (!types) return []
    const term = search.trim().toLowerCase()
    return types.filter((t) => {
      if (!term) return true
      return (
        t.name.toLowerCase().includes(term)
        || (t.description?.toLowerCase().includes(term) ?? false)
        || (t.userId?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [types, search])

  async function handleDelete(id: string) {
    if (!confirm('Delete this session type? Existing slots keep their type label.')) return
    setActing(id); setActionError(null)
    try {
      await deleteCalendarType(id)
      await reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActing(null)
    }
  }

  if (loading && !types) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Session types</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">All calendar/session types defined by hosts.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 14, height: 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, description, or owner id"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {actionError && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{actionError}</div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--border)]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No session types match.</td></tr>
              )}
              {filtered.map((t) => {
                const badge = COLOR_BADGE[t.color] ?? COLOR_BADGE.grey
                const busy = acting === t.id
                return (
                  <tr key={t.id} className="border-t border-[var(--border)] hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge}`}>
                        {t.name}
                      </span>
                      {t.isPresentation && <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Presentation</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">{t.description ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{t.userId?.slice(0, 8) ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{format(parseISO(t.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          disabled={busy}
                          onClick={() => handleDelete(t.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
