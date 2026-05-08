import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, Download, X, MessageSquare, CheckCircle, AlertCircle, GraduationCap, Save, Check } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { formatTime } from '../../components/TimeSlots'
import type { Booking, BookingStudent } from '../../types'

const COLOR_BADGE: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700',
  green: 'bg-emerald-50 text-emerald-700', grey: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-50 text-orange-700', pink: 'bg-pink-50 text-pink-700',
  teal: 'bg-teal-50 text-teal-700',
}

type TabFilter = 'upcoming' | 'pending' | 'confirmed' | 'cancelled'

export default function DashboardBookings() {
  const { bookings, slots, calendarTypeRecords, confirmBooking, cancelBooking, addAdminComment, rescheduleBooking, getAvailableSlots, exportBookingsCSV, updateBookingStudents } = useBookings()
  const [filter, setFilter] = useState<TabFilter>('upcoming')
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlotId, setRescheduleSlotId] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')
  const [scoreDraft, setScoreDraft] = useState<BookingStudent[]>([])
  const [scoresLoading, setScoresLoading] = useState(false)
  const [scoresSaved, setScoresSaved] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const upcomingCount = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.date >= today).length

  function calTypeBadge(slotId: string) {
    const slot = slots.find(s => s.id === slotId)
    const record = calendarTypeRecords.find(t => t.name === slot?.calendarType)
    return COLOR_BADGE[record?.color ?? ''] ?? 'bg-gray-100 text-gray-600'
  }

  const filtered = useMemo(() => {
    let list = bookings
    if (filter === 'upcoming') list = list.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.date >= today)
    else list = list.filter(b => b.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.studentName.toLowerCase().includes(q) ||
        b.studentEmail.toLowerCase().includes(q) ||
        b.presentationTopic.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }, [bookings, filter, search, today])

  async function handleConfirm(id: string) {
    await confirmBooking(id)
    setSelectedBooking(prev => prev?.id === id ? { ...prev, status: 'confirmed' } : prev)
  }

  async function handleCancel(id: string) {
    await cancelBooking(id)
    setSelectedBooking(prev => prev?.id === id ? { ...prev, status: 'cancelled' } : prev)
  }

  async function handleSaveComment() {
    if (!selectedBooking) return
    setCommentLoading(true)
    try {
      await addAdminComment(selectedBooking.id, commentDraft)
      setSelectedBooking(prev => prev ? { ...prev, adminComment: commentDraft } : prev)
    } finally {
      setCommentLoading(false)
    }
  }

  const rescheduleSlotsForDate = useMemo(() => {
    if (!rescheduleDate) return []
    return getAvailableSlots(rescheduleDate)
  }, [rescheduleDate, getAvailableSlots])

  async function handleReschedule() {
    if (!selectedBooking || !rescheduleSlotId) return
    setRescheduleLoading(true)
    setRescheduleError('')
    try {
      await rescheduleBooking(selectedBooking.id, rescheduleSlotId)
      const newSlot = slots.find(s => s.id === rescheduleSlotId)
      if (newSlot) setSelectedBooking(prev => prev ? { ...prev, slotId: rescheduleSlotId, date: newSlot.date, time: newSlot.time, duration: newSlot.duration } : prev)
      setRescheduleDate(''); setRescheduleSlotId('')
    } catch (e) {
      setRescheduleError(e instanceof Error ? e.message : 'Failed to reschedule.')
    } finally {
      setRescheduleLoading(false)
    }
  }

  function isCompleted(b: Booking) {
    try {
      const dt = parseISO(`${b.date}T${b.time}`)
      dt.setMinutes(dt.getMinutes() + b.duration)
      return dt < new Date()
    } catch { return false }
  }

  async function handleSaveScores() {
    if (!selectedBooking) return
    setScoresLoading(true)
    try {
      await updateBookingStudents(selectedBooking.id, scoreDraft)
      setSelectedBooking(prev => prev ? { ...prev, students: scoreDraft } : prev)
      setScoresSaved(true)
      setTimeout(() => setScoresSaved(false), 3000)
    } finally {
      setScoresLoading(false)
    }
  }

  const TABS: { key: TabFilter; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'confirmed', label: 'Confirmed', count: confirmedCount },
    { key: 'cancelled', label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length },
  ]

  const inputCls = "px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent bg-white"

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bookings</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{confirmedCount} confirmed · {pendingCount} pending</p>
          </div>
          <button
            onClick={exportBookingsCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-white transition-colors"
          >
            <Download style={{ width: 15, height: 15 }} />
            Export CSV
          </button>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex border-b border-[var(--border)] gap-0 flex-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  filter === tab.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className={`${inputCls} pl-9 w-56`}
            />
          </div>
        </div>

        <div className="flex gap-5">
          {/* List */}
          <div className={`flex-1 space-y-2 ${selectedBooking ? 'hidden md:block' : ''}`}>
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center">
                <p className="text-sm text-[var(--text-muted)]">No {filter} bookings.</p>
              </div>
            ) : filtered.map(b => {
              const slot = slots.find(s => s.id === b.slotId)
              const isSelected = selectedBooking?.id === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBooking(b); setCommentDraft(b.adminComment ?? ''); setScoreDraft(b.students ?? []); setScoresSaved(false) }}
                  className={`w-full text-left bg-white rounded-xl border transition-all p-4 flex items-start gap-4 hover:shadow-sm ${isSelected ? 'border-gray-900 shadow-sm' : 'border-[var(--border)]'}`}
                >
                  <div className="text-center shrink-0 w-10">
                    <div className="text-[10px] font-bold uppercase text-gray-400">{format(parseISO(b.date), 'EEE')}</div>
                    <div className="text-xl font-bold text-gray-900 leading-tight">{format(parseISO(b.date), 'd')}</div>
                    <div className="text-[10px] text-gray-400">{format(parseISO(b.date), 'MMM')}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{b.studentName}</p>
                      {slot?.calendarType && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${calTypeBadge(b.slotId)}`}>
                          {slot.calendarType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{b.presentationTopic}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatTime(b.time)} · {b.duration}m</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {b.status}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          {selectedBooking && (
            <div className="w-full md:w-80 shrink-0">
              <div className="bg-white rounded-xl border border-[var(--border)] p-5 sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Booking detail</h3>
                  <button onClick={() => setSelectedBooking(null)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                    <X style={{ width: 15, height: 15 }} />
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Student</p>
                    <p className="font-medium text-[var(--text-primary)]">{selectedBooking.studentName}</p>
                    <p className="text-xs text-[var(--text-muted)]">{selectedBooking.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Topic</p>
                    <p className="text-[var(--text-primary)]">{selectedBooking.presentationTopic}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Date & time</p>
                    <p className="text-[var(--text-primary)]">
                      {format(parseISO(selectedBooking.date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">{formatTime(selectedBooking.time)} · {selectedBooking.duration} min</p>
                  </div>
                  {selectedBooking.notes && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Notes</p>
                      <p className="text-xs text-[var(--text-primary)]">{selectedBooking.notes}</p>
                    </div>
                  )}
                  {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
                    <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Cancellation reason</p>
                      <p className="text-sm text-red-700">{selectedBooking.cancellationReason}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedBooking.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleConfirm(selectedBooking.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle style={{ width: 13, height: 13 }} /> Confirm
                    </button>
                    <button
                      onClick={() => handleCancel(selectedBooking.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
                    >
                      <AlertCircle style={{ width: 13, height: 13 }} /> Decline
                    </button>
                  </div>
                )}
                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(selectedBooking.id)}
                    className="w-full mt-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-colors"
                  >
                    Cancel booking
                  </button>
                )}

                {/* Reschedule */}
                {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Reschedule</p>
                    <input type="date" value={rescheduleDate} onChange={e => { setRescheduleDate(e.target.value); setRescheduleSlotId('') }} className={`${inputCls} w-full mb-2`} />
                    {rescheduleDate && (
                      <select value={rescheduleSlotId} onChange={e => setRescheduleSlotId(e.target.value)} className={`${inputCls} w-full mb-2`}>
                        <option value="">— Pick a time —</option>
                        {rescheduleSlotsForDate.map(s => (
                          <option key={s.id} value={s.id}>{formatTime(s.time)} ({s.duration}m)</option>
                        ))}
                      </select>
                    )}
                    {rescheduleError && <p className="text-xs text-red-500 mb-2">{rescheduleError}</p>}
                    <button
                      disabled={!rescheduleSlotId || rescheduleLoading}
                      onClick={handleReschedule}
                      className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {rescheduleLoading ? 'Rescheduling…' : 'Reschedule'}
                    </button>
                  </div>
                )}

                {/* Student roster + scores */}
                {selectedBooking.students && selectedBooking.students.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <GraduationCap style={{ width: 11, height: 11 }} /> Students
                      </p>
                      {isCompleted(selectedBooking) && selectedBooking.status === 'confirmed' && (
                        <span className="text-[10px] text-blue-500 font-semibold">Enter scores</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {scoreDraft.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{s.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{s.indexNumber}</p>
                          </div>
                          {isCompleted(selectedBooking) && selectedBooking.status === 'confirmed' ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={s.score ?? ''}
                              onChange={e => {
                                const val = e.target.value === '' ? null : Number(e.target.value)
                                setScoreDraft(prev => prev.map((st, idx) => idx === i ? { ...st, score: val } : st))
                                setScoresSaved(false)
                              }}
                              placeholder="—"
                              className="w-16 px-2 py-1 rounded-lg border border-[var(--border)] text-xs text-center text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-[var(--text-primary)] w-16 text-right">
                              {s.score != null ? s.score : '—'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {isCompleted(selectedBooking) && selectedBooking.status === 'confirmed' && (
                      <button
                        onClick={handleSaveScores}
                        disabled={scoresLoading}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
                      >
                        {scoresLoading ? 'Saving…' : scoresSaved ? <><Check style={{ width: 12, height: 12 }} /> Saved</> : <><Save style={{ width: 12, height: 12 }} /> Save scores</>}
                      </button>
                    )}
                  </div>
                )}

                {/* Comment */}
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1">
                    <MessageSquare style={{ width: 11, height: 11 }} /> Comment
                  </p>
                  <textarea
                    value={commentDraft}
                    onChange={e => setCommentDraft(e.target.value)}
                    rows={3}
                    placeholder="Add a note visible to you…"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  />
                  <button
                    onClick={handleSaveComment}
                    disabled={commentLoading}
                    className="mt-1.5 w-full py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    {commentLoading ? 'Saving…' : 'Save comment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
