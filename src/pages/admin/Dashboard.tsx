import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, Search, AlertCircle, Download, Filter, X, MapPin, MessageSquare, CalendarDays, CheckCircle } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { formatTime } from '../../components/TimeSlots'
import type { Booking } from '../../types'

type TabFilter = 'upcoming' | 'confirmed' | 'cancelled'

export default function Dashboard() {
  const { bookings, slots, cancelBooking, exportBookingsCSV, rescheduleBooking, addAdminComment, getAvailableSlots } = useBookings()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TabFilter>('upcoming')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Reschedule modal state
  const [rescheduleModal, setRescheduleModal] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlotId, setRescheduleSlotId] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')

  // Comment modal state
  const [commentModal, setCommentModal] = useState<Booking | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const totalSlots = slots.length
  const bookedCount = confirmedBookings.length
  const availableCount = totalSlots - bookedCount

  const filtered = useMemo(() => {
    let list = bookings
    switch (filter) {
      case 'upcoming': {
        list = list.filter((b) => b.status === 'confirmed' && b.date >= today)
        break
      }
      case 'confirmed':
      case 'cancelled':
        list = list.filter((b) => b.status === filter)
        break
    }
    if (dateFrom) list = list.filter(b => b.date >= dateFrom)
    if (dateTo) list = list.filter(b => b.date <= dateTo)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.studentName.toLowerCase().includes(q) ||
        b.studentEmail.toLowerCase().includes(q) ||
        b.presentationTopic.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }, [bookings, filter, search, dateFrom, dateTo, today])

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    for (const booking of filtered) {
      const monthKey = format(parseISO(booking.date), 'MMMM yyyy')
      if (!groups[monthKey]) groups[monthKey] = []
      groups[monthKey].push(booking)
    }
    return groups
  }, [filtered])

  const availableSlotsForReschedule = useMemo(() => {
    if (!rescheduleDate || !rescheduleModal) return []
    return getAvailableSlots(rescheduleDate)
  }, [rescheduleDate, rescheduleModal, getAvailableSlots])

  function openReschedule(booking: Booking) {
    setRescheduleModal(booking)
    setRescheduleDate('')
    setRescheduleSlotId('')
    setRescheduleError('')
  }

  async function handleReschedule() {
    if (!rescheduleModal || !rescheduleSlotId) return
    setRescheduleLoading(true)
    setRescheduleError('')
    try {
      await rescheduleBooking(rescheduleModal.id, rescheduleSlotId)
      setRescheduleModal(null)
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : 'Failed to reschedule.')
    } finally {
      setRescheduleLoading(false)
    }
  }

  function openComment(booking: Booking) {
    setCommentModal(booking)
    setCommentDraft(booking.adminComment ?? '')
  }

  async function handleSaveComment() {
    if (!commentModal) return
    setCommentLoading(true)
    try {
      await addAdminComment(commentModal.id, commentDraft)
      setCommentModal(null)
    } finally {
      setCommentLoading(false)
    }
  }

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'confirmed', label: 'All Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bookings</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">See your scheduled events from student bookings.</p>
            </div>
            <button
              onClick={exportBookingsCSV}
              disabled={confirmedBookings.length === 0}
              className="flex items-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8 stagger-children">
          {[
            { label: 'Total Slots', value: totalSlots, color: 'text-[var(--text-primary)]' },
            { label: 'Booked', value: bookedCount, color: 'text-[var(--accent)]' },
            { label: 'Available', value: availableCount, color: 'text-emerald-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-[var(--border)] mb-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                filter === tab.key
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or topic…"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <span className="text-[var(--text-muted)]">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              min={dateFrom}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-[var(--accent)] hover:underline font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bookings List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
            <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              {bookings.length === 0 ? 'No bookings yet. Students will appear here once they book.' : 'No bookings match your filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, items]) => (
              <div key={month}>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{month}</h3>
                <div className="space-y-3">
                  {items.map((booking, i) => (
                    <div
                      key={booking.id}
                      className={`bg-white rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-sm transition-shadow animate-fade-in-up ${
                        booking.status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                      style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                    >
                      <div className="p-4 sm:p-5 flex items-center gap-5">
                        {/* Date Block */}
                        <div className="text-center shrink-0 w-14">
                          <div className={`text-xs font-semibold uppercase ${
                            booking.status === 'confirmed' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                          }`}>
                            {format(parseISO(booking.date), 'EEE')}
                          </div>
                          <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                            {format(parseISO(booking.date), 'dd')}
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-10 bg-[var(--border)]" />

                        {/* Time & Location */}
                        <div className="shrink-0 space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="font-medium">{formatTime(booking.time)}</span>
                            <span className="text-[var(--text-muted)]">· {booking.duration}min</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <MapPin className="w-3 h-3" />
                            Presentation
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{booking.presentationTopic}</p>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{booking.studentName} · {booking.studentEmail}</p>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex items-center gap-1">
                          {/* Comment button */}
                          <button
                            onClick={() => openComment(booking)}
                            className={`p-2 rounded-lg transition-colors ${
                              booking.adminComment
                                ? 'text-[var(--accent)] bg-blue-50 hover:bg-blue-100'
                                : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-blue-50'
                            }`}
                            title={booking.adminComment ? 'Edit comment' : 'Add comment'}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {booking.status === 'confirmed' ? (
                            <>
                              {/* Reschedule button (only future bookings) */}
                              {booking.date >= today && (
                                <button
                                  onClick={() => openReschedule(booking)}
                                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Reschedule booking"
                                >
                                  <CalendarDays className="w-4 h-4" />
                                </button>
                              )}
                              {/* Cancel button */}
                              <button
                                onClick={() => cancelBooking(booking.id)}
                                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Cancel booking"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-red-400 bg-red-50 px-2.5 py-1 rounded-md ml-1">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Admin comment preview */}
                      {booking.adminComment && (
                        <div className="px-5 pb-3 pt-0 border-t border-[var(--border)] bg-gray-50/60">
                          <p className="text-xs text-[var(--text-secondary)] mt-2.5">
                            <span className="font-medium text-[var(--text-muted)]">Note: </span>
                            {booking.adminComment}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reschedule Modal ── */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={e => { if (e.target === e.currentTarget) setRescheduleModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Reschedule Booking</h2>
              <button onClick={() => setRescheduleModal(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current booking info */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-[var(--text-primary)]">{rescheduleModal.studentName}</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{rescheduleModal.presentationTopic}</p>
                <p className="text-[var(--text-secondary)] text-xs mt-1.5">
                  Current: {format(parseISO(rescheduleModal.date), 'EEE, dd MMM yyyy')} at {formatTime(rescheduleModal.time)}
                </p>
              </div>

              {/* Date picker */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">New Date</label>
                <input
                  type="date"
                  min={today}
                  value={rescheduleDate}
                  onChange={e => { setRescheduleDate(e.target.value); setRescheduleSlotId(''); setRescheduleError('') }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>

              {/* Available slots */}
              {rescheduleDate && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Available Time Slots</label>
                  {availableSlotsForReschedule.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-2">No available slots on this date.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlotsForReschedule.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => setRescheduleSlotId(slot.id)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${
                            rescheduleSlotId === slot.id
                              ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]'
                              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:bg-blue-50/50'
                          }`}
                        >
                          {formatTime(slot.time)}
                          <span className="text-xs text-[var(--text-muted)] ml-1">· {slot.duration}m</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {rescheduleError && (
                <p className="text-xs text-red-500">{rescheduleError}</p>
              )}
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <button
                onClick={() => setRescheduleModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!rescheduleSlotId || rescheduleLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {rescheduleLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comment Modal ── */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={e => { if (e.target === e.currentTarget) setCommentModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Admin Note</h2>
              <button onClick={() => setCommentModal(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm">
                <p className="font-medium text-[var(--text-primary)]">{commentModal.studentName}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {format(parseISO(commentModal.date), 'EEE, dd MMM yyyy')} at {formatTime(commentModal.time)} · {commentModal.presentationTopic}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Internal note (not visible to students)</label>
                <textarea
                  value={commentDraft}
                  onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Add an internal note about this booking…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <button
                onClick={() => setCommentModal(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComment}
                disabled={commentLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {commentLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
