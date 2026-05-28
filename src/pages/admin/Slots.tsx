import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2, Search, AlertTriangle, X } from 'lucide-react'
import { listAllSlots } from '../../lib/db/admin/queries'
import { deleteSlots } from '../../lib/db/admin/mutations'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { formatTime } from '../../components/TimeSlots'
import type { PresentationSlot } from '../../types'

export default function AdminSlots() {
  const [slots, setSlots] = useState<PresentationSlot[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      const next = await listAllSlots()
      setSlots(next)
      setSelected(new Set())
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const today = new Date().toISOString().slice(0, 10)
  const filtered = useMemo(() => {
    if (!slots) return []
    const term = search.trim().toLowerCase()
    return slots.filter((s) => {
      if (scope === 'upcoming' && s.date < today) return false
      if (scope === 'past' && s.date >= today) return false
      if (!term) return true
      return (
        s.calendarType.toLowerCase().includes(term)
        || (s.classGroup?.toLowerCase().includes(term) ?? false)
        || (s.userId?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [slots, scope, search, today])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    if (filtered.every((s) => selected.has(s.id))) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((s) => next.delete(s.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((s) => next.add(s.id))
        return next
      })
    }
  }

  async function runDelete() {
    setBusy(true); setActionError(null)
    try {
      await deleteSlots(Array.from(selected))
      setConfirmDelete(false)
      await reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading && !slots) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Slots</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Every availability slot. Showing the {slots?.length ?? 0} most recent.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 14, height: 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search type, class group, or user id"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['upcoming', 'past', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                scope === s ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >{s}</button>
          ))}
          {selected.size > 0 && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
            >
              <Trash2 style={{ width: 12, height: 12 }} /> Delete {selected.size}
            </button>
          )}
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
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((s) => selected.has(s.id))}
                    onChange={toggleAllVisible}
                    className="w-3.5 h-3.5"
                  />
                </th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No slots match this filter.</td></tr>
              )}
              {filtered.map((s) => {
                const isPast = s.date < today
                return (
                  <tr key={s.id} className={`border-t border-[var(--border)] hover:bg-gray-50 ${isPast ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="w-3.5 h-3.5"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{format(parseISO(s.date), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatTime(s.time)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.duration}m</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{s.calendarType}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.classGroup ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-400">{s.userId?.slice(0, 8) ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle style={{ width: 18, height: 18 }} /></div>
              <button onClick={() => setConfirmDelete(false)} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Delete {selected.size} slot{selected.size === 1 ? '' : 's'}?</h2>
            <p className="mt-1.5 text-sm text-gray-600">This permanently removes the slots. Any related bookings have their slot link nulled.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
              <button disabled={busy} onClick={runDelete} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
