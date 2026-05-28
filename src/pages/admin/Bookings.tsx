import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, XCircle, Trash2, AlertTriangle, X } from 'lucide-react'
import { listAllBookings } from '../../lib/db/admin/queries'
import { forceCancelBooking, deleteBooking } from '../../lib/db/admin/mutations'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { formatTime } from '../../components/TimeSlots'
import type { Booking } from '../../types'

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled'

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelOf, setCancelOf] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [deleteOf, setDeleteOf] = useState<Booking | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const next = await listAllBookings()
      setBookings(next)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const filtered = useMemo(() => {
    if (!bookings) return []
    const term = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (status !== 'all' && b.status !== status) return false
      if (!term) return true
      return (
        b.studentName.toLowerCase().includes(term)
        || b.studentEmail.toLowerCase().includes(term)
        || b.presentationTopic.toLowerCase().includes(term)
      )
    })
  }, [bookings, status, search])

  async function runForceCancel() {
    if (!cancelOf) return
    setActing(cancelOf.id); setActionError(null)
    try {
      await forceCancelBooking(cancelOf.id, cancelReason.trim() || 'Cancelled by admin')
      setCancelOf(null); setCancelReason('')
      await reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActing(null)
    }
  }

  async function runDelete() {
    if (!deleteOf) return
    setActing(deleteOf.id); setActionError(null)
    try {
      await deleteBooking(deleteOf.id)
      setDeleteOf(null)
      await reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActing(null)
    }
  }

  if (loading && !bookings) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bookings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Every booking across the platform. Showing the {bookings?.length ?? 0} most recent.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 14, height: 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, email, or topic"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'pending', 'confirmed', 'cancelled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                status === s ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >{s}</button>
          ))}
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
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No bookings match this filter.</td></tr>
              )}
              {filtered.map((b) => {
                const busy = acting === b.id
                const statusBadge = b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
                  : b.status === 'pending' ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                return (
                  <tr key={b.id} className="border-t border-[var(--border)] hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{format(parseISO(b.date), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-gray-500">{formatTime(b.time)} · {b.duration}m</p>
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.studentName}</p>
                      <p className="text-xs text-gray-500 truncate">{b.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={b.presentationTopic}>{b.presentationTopic}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusBadge}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{format(parseISO(b.createdAt), 'MMM d')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {b.status !== 'cancelled' && (
                          <button
                            disabled={busy}
                            onClick={() => { setCancelOf(b); setCancelReason('') }}
                            title="Force cancel"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                          >
                            <XCircle style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() => setDeleteOf(b)}
                          title="Delete booking"
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

      {/* Cancel modal */}
      {cancelOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><XCircle style={{ width: 18, height: 18 }} /></div>
              <button onClick={() => setCancelOf(null)} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Force cancel booking</h2>
            <p className="mt-1.5 text-sm text-gray-600">
              {cancelOf.studentName} · {format(parseISO(cancelOf.date), 'MMM d, yyyy')} {formatTime(cancelOf.time)}
            </p>
            <label className="block mt-4">
              <span className="text-xs font-medium text-gray-700">Reason (optional)</span>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Policy violation"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setCancelOf(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">Back</button>
              <button onClick={runForceCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700">Force cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><AlertTriangle style={{ width: 18, height: 18 }} /></div>
              <button onClick={() => setDeleteOf(null)} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X style={{ width: 16, height: 16 }} /></button>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Delete booking permanently?</h2>
            <p className="mt-1.5 text-sm text-gray-600">
              {deleteOf.studentName} · {format(parseISO(deleteOf.date), 'MMM d, yyyy')} {formatTime(deleteOf.time)}
            </p>
            <p className="mt-2 text-xs text-gray-500">This is not reversible. Prefer force-cancel unless you need the row gone.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setDeleteOf(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={runDelete} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
