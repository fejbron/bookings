import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, AlertCircle, Download, Filter, X, MessageSquare, CalendarDays, CheckCircle, Plus, User, Mail, Presentation, FileText, LayoutList } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { formatTime } from '../../components/TimeSlots'
import CalendarView from '../../components/CalendarView'
import type { Booking } from '../../types'

const COLOR_BADGE: Record<string, string> = {
  blue:   'bg-[var(--accent-light)] text-[var(--accent)]',
  purple: 'bg-purple-50 text-purple-700',
  green:  'bg-emerald-50 text-emerald-700',
  grey:   'bg-gray-100 text-gray-600',
  orange: 'bg-orange-50 text-orange-700',
  pink:   'bg-pink-50 text-pink-700',
  teal:   'bg-teal-50 text-teal-700',
}

type TabFilter = 'upcoming' | 'pending' | 'confirmed' | 'cancelled'

export default function Dashboard() {
  const { bookings, slots, calendarTypeRecords, cancelBooking, confirmBooking, exportBookingsCSV, rescheduleBooking, addAdminComment, getAvailableSlots, bookSlot } = useBookings()
  const [pageView, setPageView] = useState<'list' | 'calendar'>('list')

  function calTypeBadgeClass(typeName: string) {
    const record = calendarTypeRecords.find(t => t.name === typeName)
    return COLOR_BADGE[record?.color ?? ''] ?? 'bg-gray-100 text-gray-600'
  }
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TabFilter>('upcoming')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [calendarTypeFilter, setCalendarTypeFilter] = useState('')

  // All unique calendar types across all bookings (via their slots)
  const allCalendarTypes = useMemo(() => {
    const types = new Set<string>()
    for (const b of bookings) {
      const slot = slots.find(s => s.id === b.slotId)
      if (slot?.calendarType) types.add(slot.calendarType)
    }
    return Array.from(types).sort()
  }, [bookings, slots])

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

  // New booking modal state
  const [newBookingOpen, setNewBookingOpen] = useState(false)
  const [nbDate, setNbDate] = useState('')
  const [nbSlotId, setNbSlotId] = useState('')
  const [nbName, setNbName] = useState('')
  const [nbEmail, setNbEmail] = useState('')
  const [nbTopic, setNbTopic] = useState('')
  const [nbNotes, setNbNotes] = useState('')
  const [nbErrors, setNbErrors] = useState<Record<string, string>>({})
  const [nbLoading, setNbLoading] = useState(false)
  const [nbError, setNbError] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const totalSlots = slots.length
  const bookedCount = confirmedBookings.length
  const availableCount = totalSlots - bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length

  const filtered = useMemo(() => {
    let list = bookings
    switch (filter) {
      case 'upcoming': {
        list = list.filter((b) => (b.status === 'confirmed' || b.status === 'pending') && b.date >= today)
        break
      }
      case 'pending':
      case 'confirmed':
      case 'cancelled':
        list = list.filter((b) => b.status === filter)
        break
    }
    if (calendarTypeFilter) {
      list = list.filter(b => {
        const slot = slots.find(s => s.id === b.slotId)
        return slot?.calendarType === calendarTypeFilter
      })
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
  }, [bookings, slots, filter, calendarTypeFilter, search, dateFrom, dateTo, today])

  const availableSlotsForReschedule = useMemo(() => {
    if (!rescheduleDate || !rescheduleModal) return []
    return getAvailableSlots(rescheduleDate)
  }, [rescheduleDate, rescheduleModal, getAvailableSlots])

  const availableSlotsForNewBooking = useMemo(() => {
    if (!nbDate) return []
    return getAvailableSlots(nbDate)
  }, [nbDate, getAvailableSlots])

  const TOPIC_HIDDEN_TYPES = ['Office Meeting', 'Other', 'Personal']

  const nbSlotType = useMemo(() => {
    if (!nbSlotId) return null
    return availableSlotsForNewBooking.find(s => s.id === nbSlotId)?.calendarType ?? null
  }, [nbSlotId, availableSlotsForNewBooking])

  const nbTopicHidden = TOPIC_HIDDEN_TYPES.includes(nbSlotType ?? '')

  function openNewBooking() {
    setNewBookingOpen(true)
    setNbDate(''); setNbSlotId(''); setNbName(''); setNbEmail('')
    setNbTopic(''); setNbNotes('')
    setNbErrors({}); setNbError('')
  }

  function validateNewBooking(): boolean {
    const errs: Record<string, string> = {}
    if (!nbDate) errs.date = 'Select a date.'
    if (!nbSlotId) errs.slot = 'Select a time slot.'
    if (!nbName.trim()) errs.name = 'Full name is required.'
    if (!nbEmail.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nbEmail.trim())) errs.email = 'Enter a valid email.'
    if (!nbTopicHidden && !nbTopic.trim()) errs.topic = 'Presentation topic is required.'
    setNbErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleNewBooking() {
    if (!validateNewBooking()) return
    setNbLoading(true)
    setNbError('')
    try {
      await bookSlot(nbSlotId, {
        studentName: nbName.trim(),
        studentEmail: nbEmail.trim(),
        presentationTopic: nbTopicHidden ? (nbSlotType ?? 'Meeting') : nbTopic.trim(),
        notes: nbNotes.trim(),
      })
      setNewBookingOpen(false)
    } catch (err) {
      setNbError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setNbLoading(false)
    }
  }

  function isCompleted(dateStr: string, timeStr: string, duration: number): boolean {
    try {
      const dt = parseISO(`${dateStr}T${timeStr}`)
      dt.setMinutes(dt.getMinutes() + duration)
      return dt < new Date()
    } catch { return false }
  }

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
    { key: 'pending', label: `Pending${pendingBookings.length > 0 ? ` (${pendingBookings.length})` : ''}` },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  // Collapse past bookings on status tabs — tracks which past months are expanded
  const [expandedPastMonths, setExpandedPastMonths] = useState<Set<string>>(new Set())

  function togglePastMonth(month: string) {
    setExpandedPastMonths(prev => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  // Detail panel state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  function statusBorderColor(status: Booking['status']): string {
    switch (status) {
      case 'confirmed': return '#006BFF'
      case 'pending':   return '#D97706'
      case 'cancelled': return '#DC2626'
      default:          return '#E5E7EB'
    }
  }

  function StatusBadge({ status }: { status: Booking['status'] }) {
    const styles: Record<string, string> = {
      confirmed: 'bg-[var(--status-confirmed-bg)] text-[var(--status-confirmed)]',
      pending:   'bg-[var(--status-pending-bg)] text-[var(--status-pending)]',
      cancelled: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]',
    }
    const label: Record<string, string> = { confirmed: '+ Confirmed', pending: '● Pending', cancelled: '✕ Cancelled' }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? ''}`}>
        {label[status] ?? status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className={`mx-auto px-6 sm:px-8 py-8 sm:py-10 transition-all duration-300 ${pageView === 'list' && selectedBooking ? 'max-w-5xl' : 'max-w-4xl'}`}>
        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
              <p className="mt-0.5 text-sm text-gray-500">{bookings.filter(b => b.status === 'confirmed' && b.date >= today).length} upcoming · {pendingBookings.length} pending review</p>
            </div>
            <div className="flex items-center gap-2">
              {/* List / Calendar toggle */}
              <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => { setPageView('list'); setSelectedBooking(null) }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${pageView === 'list' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
                >
                  <LayoutList className="w-3.5 h-3.5" /> List
                </button>
                <button
                  onClick={() => { setPageView('calendar'); setSelectedBooking(null) }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${pageView === 'calendar' ? 'bg-[var(--text-primary)] text-white' : 'text-[var(--text-muted)] hover:bg-gray-50'}`}
                >
                  <CalendarDays className="w-3.5 h-3.5" /> Calendar
                </button>
              </div>

              <button
                onClick={openNewBooking}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New booking
              </button>
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
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6 stagger-children">
          {[
            { label: 'Total slots', value: totalSlots, color: 'text-gray-900' },
            { label: 'Confirmed', value: bookedCount, color: 'text-[var(--accent)]' },
            { label: 'Available', value: availableCount, color: 'text-[var(--status-confirmed)]' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Calendar view ── */}
        {pageView === 'calendar' && (
          <div className="animate-fade-in">
            <CalendarView
              bookings={bookings}
              slots={slots}
              calendarTypeRecords={calendarTypeRecords}
              onSelectBooking={b => setSelectedBooking(prev => prev?.id === b.id ? null : b)}
              selectedBookingId={selectedBooking?.id}
            />
          </div>
        )}

        {/* Main content + detail panel */}
        {pageView === 'list' && <div className="flex gap-5 items-start">
          {/* Left column — list */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-gray-200 mb-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setFilter(tab.key); setExpandedPastMonths(new Set()); setCalendarTypeFilter('') }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    filter === tab.key
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Date Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
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
                  <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-[var(--accent)] hover:underline font-medium">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Calendar type filter — shown only when multiple types exist */}
            {allCalendarTypes.length > 1 && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <button
                  onClick={() => setCalendarTypeFilter('')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${!calendarTypeFilter ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-white' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                  All types
                </button>
                {allCalendarTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setCalendarTypeFilter(calendarTypeFilter === type ? '' : type)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      calendarTypeFilter === type
                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-white'
                        : `${calTypeBadgeClass(type)} border-transparent hover:border-gray-200`
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}

            {/* Bookings List */}
            {(() => {
              // On status tabs (not 'upcoming'), split into future and past
              const isStatusTab = filter !== 'upcoming'
              const upcomingFiltered = isStatusTab ? filtered.filter(b => b.date >= today) : filtered
              const pastFiltered = isStatusTab ? filtered.filter(b => b.date < today) : []

              function groupByMonth(list: typeof filtered) {
                const groups: Record<string, typeof filtered> = {}
                for (const b of list) {
                  const key = format(parseISO(b.date), 'MMMM yyyy')
                  if (!groups[key]) groups[key] = []
                  groups[key].push(b)
                }
                return groups
              }

              function BookingRow({ booking, i }: { booking: typeof filtered[0]; i: number }) {
                const isSelected = selectedBooking?.id === booking.id
                return (
                  <div
                    key={booking.id}
                    onClick={() => setSelectedBooking(isSelected ? null : booking)}
                    className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors animate-fade-in-up ${
                      i !== 0 ? 'border-t border-[var(--border)]' : ''
                    } ${isSelected ? 'bg-[var(--accent-light)]' : 'hover:bg-gray-50'} ${
                      booking.status === 'cancelled' ? 'opacity-50' : ''
                    }`}
                    style={{
                      borderLeft: `3px solid ${statusBorderColor(booking.status)}`,
                      animationDelay: `${Math.min(i * 20, 150)}ms`,
                    }}
                  >
                    <div className="text-center shrink-0 w-11">
                      <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                        {format(parseISO(booking.date), 'EEE')}
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)] leading-tight">
                        {format(parseISO(booking.date), 'dd')}
                      </div>
                    </div>
                    <div className="w-px h-9 bg-[var(--border)] shrink-0" />
                    <div className="shrink-0 w-24">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{formatTime(booking.time)}</div>
                      <div className="text-xs text-[var(--text-muted)]">{booking.duration} min</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {(() => {
                        const bSlot = slots.find(s => s.id === booking.slotId)
                        const topicHidden = TOPIC_HIDDEN_TYPES.includes(bSlot?.calendarType ?? '')
                        return (
                          <>
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {topicHidden ? booking.studentName : booking.presentationTopic}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                              {topicHidden ? booking.studentEmail : booking.studentName}
                            </p>
                          </>
                        )
                      })()}
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                )
              }

              function MonthGroup({ month, items }: { month: string; items: typeof filtered }) {
                return (
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">{month}</h3>
                    <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
                      {items.map((booking, i) => <BookingRow key={booking.id} booking={booking} i={i} />)}
                    </div>
                  </div>
                )
              }

              if (filtered.length === 0) {
                return (
                  <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
                    <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-muted)]">
                      {bookings.length === 0 ? 'No bookings yet. Students will appear here once they book.' : 'No bookings match your filters.'}
                    </p>
                  </div>
                )
              }

              const upcomingGroups = groupByMonth(upcomingFiltered)
              const pastGroups = groupByMonth(pastFiltered)

              return (
                <div className="space-y-8">
                  {/* Upcoming / all entries */}
                  {upcomingFiltered.length === 0 && isStatusTab ? (
                    <div className="bg-white rounded-xl border border-[var(--border)] p-8 text-center">
                      <p className="text-sm text-[var(--text-muted)]">No upcoming bookings in this category.</p>
                    </div>
                  ) : (
                    Object.entries(upcomingGroups).map(([month, items]) => (
                      <MonthGroup key={month} month={month} items={items} />
                    ))
                  )}

                  {/* Past bookings — per-month accordion, only on status tabs */}
                  {isStatusTab && pastFiltered.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                        Past · {pastFiltered.length} booking{pastFiltered.length !== 1 ? 's' : ''}
                      </p>
                      {Object.entries(pastGroups).reverse().map(([month, items]) => {
                        const isOpen = expandedPastMonths.has(month)
                        return (
                          <div key={month}>
                            <button
                              onClick={() => togglePastMonth(month)}
                              className="w-full flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-[var(--border)] hover:bg-gray-50 transition-colors"
                              style={{ boxShadow: 'var(--card-shadow)' }}
                            >
                              <span className="text-sm font-medium text-[var(--text-secondary)]">{month}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--text-muted)]">{items.length} booking{items.length !== 1 ? 's' : ''}</span>
                                <span className={`text-[var(--text-muted)] text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                              </div>
                            </button>
                            {isOpen && (
                              <div className="mt-1.5 animate-fade-in">
                                <div className="bg-white rounded-xl border border-[var(--border)] overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
                                  {items.map((booking, i) => <BookingRow key={booking.id} booking={booking} i={i} />)}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Right column — Detail panel */}
          {selectedBooking && (
            <div className="w-80 shrink-0 bg-white rounded-xl border border-[var(--border)] overflow-hidden animate-slide-in-right sticky top-20" style={{ boxShadow: 'var(--card-shadow)' }}>
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Booking Detail</span>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-14rem)]">
                {/* Student */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-bold text-sm shrink-0">
                    {selectedBooking.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)]">{selectedBooking.studentName}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{selectedBooking.studentEmail}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedBooking.status} />
                  {isCompleted(selectedBooking.date, selectedBooking.time, selectedBooking.duration) && selectedBooking.status === 'confirmed' && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
                  )}
                </div>

                {/* Date / Time / Duration / Calendar chips */}
                {(() => {
                  const bookingSlot = slots.find(s => s.id === selectedBooking.slotId)
                  const calType = bookingSlot?.calendarType
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'DATE', value: format(parseISO(selectedBooking.date), 'EEE, dd MMM yyyy') },
                        { label: 'TIME', value: formatTime(selectedBooking.time) },
                        { label: 'DURATION', value: `${selectedBooking.duration} min` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                          <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 leading-tight">{value}</p>
                        </div>
                      ))}
                      {calType && (
                        <div className="col-span-2 bg-gray-50 rounded-lg p-2.5 flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Calendar</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${calTypeBadgeClass(calType)}`}>
                            {calType}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Topic */}
                {(() => {
                  const bookingSlot2 = slots.find(s => s.id === selectedBooking.slotId)
                  const topicHidden = ['Office Meeting', 'Other', 'Personal'].includes(bookingSlot2?.calendarType ?? '')
                  return !topicHidden && (
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Presentation Topic</p>
                      <p className="text-sm text-[var(--text-primary)]">{selectedBooking.presentationTopic}</p>
                    </div>
                  )
                })()}

                {/* Notes */}
                {selectedBooking.notes && (
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{selectedBooking.notes}</p>
                  </div>
                )}

                {/* Admin comment */}
                {selectedBooking.adminComment && (
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Internal Note</p>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">{selectedBooking.adminComment}</p>
                  </div>
                )}

                {/* Cancellation reason */}
                {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Cancellation Reason</p>
                    <p className="text-sm text-red-700 leading-relaxed">{selectedBooking.cancellationReason}</p>
                  </div>
                )}

                {/* Booking meta */}
                <div className="pt-1 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
                  <p>ID: {selectedBooking.id.slice(0, 8).toUpperCase()}</p>
                  <p className="mt-0.5">Booked {format(parseISO(selectedBooking.createdAt), 'dd MMM yyyy')}</p>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  {selectedBooking.status === 'pending' && (
                    <button
                      onClick={() => { confirmBooking(selectedBooking.id); setSelectedBooking(prev => prev ? { ...prev, status: 'confirmed' } : null) }}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--status-confirmed)] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <CheckCircle className="w-4 h-4" /> Confirm Booking
                    </button>
                  )}
                  {selectedBooking.status === 'confirmed' && selectedBooking.date >= today && !isCompleted(selectedBooking.date, selectedBooking.time, selectedBooking.duration) && (
                    <button
                      onClick={() => openReschedule(selectedBooking)}
                      className="w-full flex items-center justify-center gap-2 border border-[var(--accent)] text-[var(--accent)] py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)] transition-colors"
                    >
                      <CalendarDays className="w-4 h-4" /> Reschedule
                    </button>
                  )}
                  <button
                    onClick={() => openComment(selectedBooking)}
                    className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" /> {selectedBooking.adminComment ? 'Edit Note' : 'Add Note'}
                  </button>
                  {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                    <button
                      onClick={() => { cancelBooking(selectedBooking.id); setSelectedBooking(prev => prev ? { ...prev, status: 'cancelled' } : null) }}
                      className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" /> Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>}

      </div>

      {/* ── New Booking Modal ── */}
      {newBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={e => { if (e.target === e.currentTarget) setNewBookingOpen(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Book a Slot</h2>
              <button onClick={() => setNewBookingOpen(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Date</label>
                <input
                  type="date"
                  min={today}
                  value={nbDate}
                  onChange={e => { setNbDate(e.target.value); setNbSlotId(''); setNbErrors(prev => ({ ...prev, date: '', slot: '' })) }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                {nbErrors.date && <p className="mt-1 text-xs text-red-500">{nbErrors.date}</p>}
              </div>

              {/* Time slot */}
              {nbDate && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Time Slot</label>
                  {availableSlotsForNewBooking.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-1">No available slots on this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlotsForNewBooking.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => { setNbSlotId(slot.id); setNbErrors(prev => ({ ...prev, slot: '' })) }}
                          className={`px-2 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            nbSlotId === slot.id
                              ? 'border-[var(--accent)] bg-orange-50 text-[var(--accent)]'
                              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:bg-orange-50/50'
                          }`}
                        >
                          {formatTime(slot.time)}
                          <span className="block text-xs text-[var(--text-muted)] font-normal">{slot.duration}min</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {nbErrors.slot && <p className="mt-1 text-xs text-red-500">{nbErrors.slot}</p>}
                </div>
              )}

              {/* Student fields */}
              {[
                { icon: User, label: 'Full Name', key: 'name', type: 'text', val: nbName, set: setNbName, placeholder: 'Jane Smith', max: 100 },
                { icon: Mail, label: 'Email', key: 'email', type: 'email', val: nbEmail, set: setNbEmail, placeholder: 'student@example.com', max: 254 },
                ...(!nbTopicHidden ? [{ icon: Presentation, label: 'Presentation Topic', key: 'topic', type: 'text', val: nbTopic, set: setNbTopic, placeholder: 'e.g. Final Year Project Demo', max: 200 }] : []),
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                    <f.icon className="w-3 h-3" /> {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.val}
                    onChange={e => { f.set(e.target.value); setNbErrors(prev => ({ ...prev, [f.key]: '' })) }}
                    placeholder={f.placeholder}
                    maxLength={f.max}
                    className={`w-full px-3 py-2 rounded-lg border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${nbErrors[f.key] ? 'border-red-300' : 'border-[var(--border)]'}`}
                  />
                  {nbErrors[f.key] && <p className="mt-1 text-xs text-red-500">{nbErrors[f.key]}</p>}
                </div>
              ))}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Notes (optional)
                </label>
                <textarea
                  value={nbNotes}
                  onChange={e => setNbNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Any additional notes…"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                />
              </div>

              {nbError && <p className="text-xs text-red-500">{nbError}</p>}
            </div>

            <div className="flex gap-2 p-5 pt-0 shrink-0">
              <button
                onClick={() => setNewBookingOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewBooking}
                disabled={nbLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {nbLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Calendar booking detail modal ── */}
      {pageView === 'calendar' && selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedBooking(null) }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedBooking.studentName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedBooking.studentName}</span>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Status */}
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedBooking.status} />
                {isCompleted(selectedBooking.date, selectedBooking.time, selectedBooking.duration) && selectedBooking.status === 'confirmed' && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Completed</span>
                )}
              </div>

              {/* Info chips */}
              {(() => {
                const bookingSlot = slots.find(s => s.id === selectedBooking.slotId)
                const calType = bookingSlot?.calendarType
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'DATE',     value: format(parseISO(selectedBooking.date), 'EEE, dd MMM yyyy') },
                      { label: 'TIME',     value: formatTime(selectedBooking.time) },
                      { label: 'DURATION', value: `${selectedBooking.duration} min` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                        <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{value}</p>
                      </div>
                    ))}
                    {calType && (
                      <div className="col-span-2 bg-gray-50 rounded-lg p-2.5 flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Calendar</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${calTypeBadgeClass(calType)}`}>{calType}</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Topic */}
              {!['Office Meeting', 'Other', 'Personal'].includes(
                slots.find(s => s.id === selectedBooking.slotId)?.calendarType ?? ''
              ) && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Presentation Topic</p>
                  <p className="text-sm text-[var(--text-primary)]">{selectedBooking.presentationTopic}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-[var(--text-secondary)]">{selectedBooking.studentEmail}</p>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Admin comment */}
              {selectedBooking.adminComment && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Internal Note</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">{selectedBooking.adminComment}</p>
                </div>
              )}

              {/* Cancellation reason */}
              {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-1">Cancellation Reason</p>
                  <p className="text-sm text-red-700 leading-relaxed">{selectedBooking.cancellationReason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                {selectedBooking.status === 'pending' && (
                  <button
                    onClick={() => { confirmBooking(selectedBooking.id); setSelectedBooking(prev => prev ? { ...prev, status: 'confirmed' } : null) }}
                    className="w-full flex items-center justify-center gap-2 bg-[var(--status-confirmed)] text-white py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <CheckCircle className="w-4 h-4" /> Confirm Booking
                  </button>
                )}
                {selectedBooking.status === 'confirmed' && selectedBooking.date >= today && !isCompleted(selectedBooking.date, selectedBooking.time, selectedBooking.duration) && (
                  <button
                    onClick={() => { setSelectedBooking(null); openReschedule(selectedBooking) }}
                    className="w-full flex items-center justify-center gap-2 border border-[var(--accent)] text-[var(--accent)] py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--accent-light)] transition-colors"
                  >
                    <CalendarDays className="w-4 h-4" /> Reschedule
                  </button>
                )}
                <button
                  onClick={() => { setSelectedBooking(null); openComment(selectedBooking) }}
                  className="w-full flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> {selectedBooking.adminComment ? 'Edit Note' : 'Add Note'}
                </button>
                {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                  <button
                    onClick={() => { cancelBooking(selectedBooking.id); setSelectedBooking(prev => prev ? { ...prev, status: 'cancelled' } : null) }}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" /> Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
