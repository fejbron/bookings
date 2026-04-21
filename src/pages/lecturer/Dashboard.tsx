import { useState, useMemo } from 'react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { Clock, Search, AlertCircle, Filter, X, MapPin, MessageSquare, CalendarDays, CheckCircle, AlertTriangle, Plus, Trash2, Calendar, Info, UserPlus } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import { formatTime } from '../../components/TimeSlots'
import type { Booking } from '../../types'

type MainTab = 'bookings' | 'availability'
type BookingFilter = 'upcoming' | 'confirmed' | 'cancelled'

export default function LecturerDashboard() {
  const { bookings, getLecturerBookings, getLecturerSlots, cancelBooking, rescheduleBooking, addAdminComment, getAvailableSlots, generateSlots, removeSlot, bookSlot, adminSettings } = useBookings()
  const { currentLecturer } = useAuth()

  const [mainTab, setMainTab] = useState<MainTab>('bookings')

  // ── Bookings state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<BookingFilter>('upcoming')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [rescheduleModal, setRescheduleModal] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlotId, setRescheduleSlotId] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')

  const [commentModal, setCommentModal] = useState<Booking | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  // ── Add booking state ───────────────────────────────────────────────────────
  const [addBookingOpen, setAddBookingOpen] = useState(false)
  const [addSlotId, setAddSlotId] = useState('')
  const [addDate, setAddDate] = useState('')
  const [addStudentName, setAddStudentName] = useState('')
  const [addStudentEmail, setAddStudentEmail] = useState('')
  const [addTopic, setAddTopic] = useState('')
  const [addPurpose, setAddPurpose] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  // ── Availability state ──────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [duration, setDuration] = useState(15)
  const [excludeWeekends, setExcludeWeekends] = useState(true)
  const [classGroup, setClassGroup] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState<number | null>(null)
  const [generateError, setGenerateError] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [deleteConfirmSlot, setDeleteConfirmSlot] = useState<string | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const lecturerName = currentLecturer?.name ?? ''

  const myBookings = useMemo(() => getLecturerBookings(lecturerName), [getLecturerBookings, lecturerName])
  const mySlots = useMemo(() => getLecturerSlots(lecturerName), [getLecturerSlots, lecturerName])

  const confirmedBookings = myBookings.filter(b => b.status === 'confirmed')
  const bookedCount = confirmedBookings.length
  const availableCount = mySlots.filter(s => !bookings.some(b => b.slotId === s.id && b.status === 'confirmed')).length

  // ── Bookings logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = myBookings
    switch (filter) {
      case 'upcoming':
        list = list.filter(b => b.status === 'confirmed' && b.date >= today)
        break
      case 'confirmed':
      case 'cancelled':
        list = list.filter(b => b.status === filter)
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
  }, [myBookings, filter, search, dateFrom, dateTo, today])

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    for (const booking of filtered) {
      const key = format(parseISO(booking.date), 'MMMM yyyy')
      if (!groups[key]) groups[key] = []
      groups[key].push(booking)
    }
    return groups
  }, [filtered])

  const availableSlotsForReschedule = useMemo(() => {
    if (!rescheduleDate || !rescheduleModal) return []
    return getAvailableSlots(rescheduleDate).filter(
      s => s.lecturerName?.toLowerCase() === lecturerName.toLowerCase()
    )
  }, [rescheduleDate, rescheduleModal, getAvailableSlots, lecturerName])

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

  const addBookingSlotsForDate = useMemo(() => {
    if (!addDate) return []
    return getAvailableSlots(addDate).filter(s => s.lecturerName?.toLowerCase() === lecturerName.toLowerCase())
  }, [addDate, getAvailableSlots, lecturerName])

  function openAddBooking() {
    setAddBookingOpen(true)
    setAddDate('')
    setAddSlotId('')
    setAddStudentName('')
    setAddStudentEmail('')
    setAddTopic('')
    setAddPurpose(adminSettings.bookingPurposes[0] ?? '')
    setAddNotes('')
    setAddError('')
  }

  async function handleAddBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!addSlotId) { setAddError('Please select a time slot.'); return }
    setAddLoading(true)
    setAddError('')
    try {
      await bookSlot(addSlotId, {
        studentName: addStudentName.trim(),
        studentEmail: addStudentEmail.trim(),
        presentationTopic: addTopic.trim(),
        notes: addNotes.trim(),
        bookingPurpose: addPurpose,
      })
      setAddBookingOpen(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create booking.')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Availability logic ──────────────────────────────────────────────────────
  const canGenerate = startDate && endDate && startDate <= endDate && startTime < endTime

  const previewInfo = useMemo(() => {
    if (!canGenerate) return null
    try {
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      const filtered = excludeWeekends ? days.filter(d => d.getDay() !== 0 && d.getDay() !== 6) : days
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const totalMin = (eh * 60 + em) - (sh * 60 + sm)
      const perDay = Math.floor(totalMin / duration)
      return { days: filtered.length, perDay, total: filtered.length * perDay }
    } catch { return null }
  }, [canGenerate, startDate, endDate, startTime, endTime, duration, excludeWeekends])

  const bookedSlotIds = new Set(bookings.filter(b => b.status === 'confirmed').map(b => b.slotId))

  const groupedSlots = useMemo(() => {
    const groups: Record<string, typeof mySlots> = {}
    const sorted = [...mySlots].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    for (const s of sorted) {
      if (!groups[s.date]) groups[s.date] = []
      groups[s.date].push(s)
    }
    return groups
  }, [mySlots])

  const allDates = Object.keys(groupedSlots).sort()
  const pastDates = allDates.filter(d => d < today)
  const upcomingDates = allDates.filter(d => d >= today)
  const visibleDates = showPast ? allDates : upcomingDates

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setGenerateError('')
    try {
      const result = await generateSlots({
        startDate, endDate, startTime, endTime, duration, excludeWeekends,
        lecturerName,
        classGroup: classGroup.trim() || undefined,
      })
      setGenerated(result.length)
      setTimeout(() => setGenerated(null), 4000)
      setStartDate('')
      setEndDate('')
      setClassGroup('')
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate slots.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRemoveSlot(id: string) {
    await removeSlot(id)
    setDeleteConfirmSlot(null)
  }

  const bookingTabs: { key: BookingFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'confirmed', label: 'All Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const fieldCls = "w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition bg-white"

  if (!lecturerName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-[var(--text-muted)]">No lecturer profile found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{lecturerName}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{currentLecturer?.classGroup ?? 'Lecturer dashboard'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 stagger-children">
          {[
            { label: 'Total Slots', value: mySlots.length, color: 'text-[var(--text-primary)]' },
            { label: 'Booked', value: bookedCount, color: 'text-[var(--accent)]' },
            { label: 'Available', value: availableCount, color: 'text-emerald-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main tabs */}
        <div className="flex border-b border-[var(--border)] mb-6">
          {([
            { key: 'bookings', label: 'Bookings' },
            { key: 'availability', label: 'Availability' },
          ] as { key: MainTab; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                mainTab === tab.key
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── BOOKINGS TAB ── */}
        {mainTab === 'bookings' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-0 border-b border-[var(--border)] flex-1">
                {bookingTabs.map(tab => (
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
              <button
                onClick={openAddBooking}
                className="ml-4 flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Add Booking
              </button>
            </div>

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
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                <span className="text-[var(--text-muted)]">–</span>
                <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-[var(--accent)] hover:underline font-medium">Clear</button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
                <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">
                  {myBookings.length === 0
                    ? 'No bookings yet. Make sure your name on slots matches your account name exactly.'
                    : 'No bookings match your filters.'}
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
                          className={`bg-white rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-sm transition-shadow animate-fade-in-up ${booking.status === 'cancelled' ? 'opacity-50' : ''}`}
                          style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                        >
                          <div className="p-4 sm:p-5 flex items-center gap-5">
                            <div className="text-center shrink-0 w-14">
                              <div className={`text-xs font-semibold uppercase ${booking.status === 'confirmed' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                                {format(parseISO(booking.date), 'EEE')}
                              </div>
                              <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                                {format(parseISO(booking.date), 'dd')}
                              </div>
                            </div>
                            <div className="w-px h-10 bg-[var(--border)]" />
                            <div className="shrink-0 space-y-1">
                              <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <span className="font-medium">{formatTime(booking.time)}</span>
                                <span className="text-[var(--text-muted)]">· {booking.duration}min</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                <MapPin className="w-3 h-3" /> Presentation
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{booking.presentationTopic}</p>
                              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{booking.studentName} · {booking.studentEmail}</p>
                              {booking.bookingPurpose && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-[var(--text-secondary)] font-medium">{booking.bookingPurpose}</span>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-1">
                              <button
                                onClick={() => openComment(booking)}
                                className={`p-2 rounded-lg transition-colors ${booking.adminComment ? 'text-[var(--accent)] bg-blue-50 hover:bg-blue-100' : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-blue-50'}`}
                                title={booking.adminComment ? 'Edit note' : 'Add note'}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              {booking.status === 'confirmed' ? (
                                <>
                                  {booking.date >= today && (
                                    <button
                                      onClick={() => openReschedule(booking)}
                                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="Reschedule"
                                    >
                                      <CalendarDays className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => cancelBooking(booking.id)}
                                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Cancel booking"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-medium text-red-400 bg-red-50 px-2.5 py-1 rounded-md ml-1">Cancelled</span>
                              )}
                            </div>
                          </div>
                          {booking.adminComment && (
                            <div className="px-5 pb-3 pt-0 border-t border-[var(--border)] bg-gray-50/60">
                              <p className="text-xs text-[var(--text-secondary)] mt-2.5">
                                <span className="font-medium text-[var(--text-muted)]">Note: </span>{booking.adminComment}
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
          </>
        )}

        {/* ── AVAILABILITY TAB ── */}
        {mainTab === 'availability' && (
          <>
            <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 mb-8 animate-fade-in-up">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--accent)]" />
                Add Availability
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Date</label>
                  <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Date</label>
                  <input type="date" min={startDate || today} value={endDate} onChange={e => setEndDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Time</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={fieldCls} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Slot Duration</label>
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} className={fieldCls}>
                    {[5, 10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Class Group <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={classGroup}
                    onChange={e => setClassGroup(e.target.value)}
                    placeholder={currentLecturer?.classGroup ?? 'e.g. CS Year 3'}
                    maxLength={100}
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeWeekends}
                    onChange={e => setExcludeWeekends(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Exclude weekends</span>
                </label>
              </div>

              {previewInfo && previewInfo.total > 0 && (
                <div className="mb-5 flex items-start gap-2 text-sm text-[var(--accent)] bg-[var(--accent-light)] rounded-lg p-3 border border-orange-100">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This will create <strong>{previewInfo.total}</strong> slot{previewInfo.total !== 1 ? 's' : ''} across{' '}
                    <strong>{previewInfo.days}</strong> day{previewInfo.days !== 1 ? 's' : ''} ({previewInfo.perDay} per day · {duration} min each)
                  </span>
                </div>
              )}

              {generateError && (
                <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {generateError}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!canGenerate || generating}
                  className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Plus className="w-4 h-4" />}
                  {generating ? 'Generating…' : 'Generate Slots'}
                </button>
                {generated !== null && (
                  <span className="text-sm text-emerald-600 font-medium animate-fade-in">
                    ✓ {generated} slot{generated !== 1 ? 's' : ''} created!
                  </span>
                )}
              </div>
            </form>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                {showPast ? 'All My Slots' : 'Upcoming Slots'}{' '}
                <span className="text-[var(--text-muted)] font-normal">({visibleDates.length} date{visibleDates.length !== 1 ? 's' : ''})</span>
              </h2>
            </div>

            {allDates.length === 0 ? (
              <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-[var(--text-muted)]">No slots yet. Use the form above to add your availability.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastDates.length > 0 && (
                  <button
                    onClick={() => setShowPast(p => !p)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {showPast ? 'Hide past dates' : `Show ${pastDates.length} past date${pastDates.length !== 1 ? 's' : ''}`}
                  </button>
                )}

                {upcomingDates.length === 0 && !showPast && (
                  <div className="bg-white rounded-xl border border-[var(--border)] p-10 text-center">
                    <p className="text-sm text-[var(--text-muted)]">No upcoming slots. Add availability above.</p>
                  </div>
                )}

                {visibleDates.map((date, di) => {
                  const isPast = date < today
                  const ds = groupedSlots[date]
                  const bookedInDay = ds.filter(s => bookedSlotIds.has(s.id)).length
                  return (
                    <div
                      key={date}
                      className={`rounded-xl border overflow-hidden animate-fade-in-up ${isPast ? 'bg-gray-50 border-[var(--border)] opacity-60' : 'bg-white border-[var(--border)]'}`}
                      style={{ animationDelay: `${Math.min(di * 40, 240)}ms` }}
                    >
                      <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--border)]">
                        <Calendar className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</span>
                        <span className="ml-auto text-xs text-[var(--text-muted)]">
                          {bookedInDay > 0 ? `${bookedInDay}/${ds.length} booked` : `${ds.length} slots`}
                        </span>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {ds.map(slot => {
                          const isBooked = bookedSlotIds.has(slot.id)
                          return (
                            <div key={slot.id} className={`group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg text-xs border transition-all ${isBooked ? 'bg-[var(--accent-light)] border-orange-200 text-[var(--accent)]' : 'bg-gray-50 border-[var(--border)] text-[var(--text-secondary)] hover:border-gray-300'}`}>
                              <Clock className="w-3 h-3 opacity-50" />
                              <span className="font-medium">{formatTime(slot.time)}</span>
                              <span className="opacity-60">{slot.duration}m</span>
                              {slot.classGroup && <span className="opacity-70">{slot.classGroup}</span>}
                              {isBooked ? (
                                <span className="text-[10px] bg-orange-100 text-[var(--accent)] px-1.5 py-0.5 rounded font-medium">Booked</span>
                              ) : deleteConfirmSlot === slot.id ? (
                                <div className="flex items-center gap-1 animate-scale-in">
                                  <button onClick={() => handleRemoveSlot(slot.id)} className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white bg-red-500 hover:bg-red-600">Yes</button>
                                  <button onClick={() => setDeleteConfirmSlot(null)} className="px-1.5 py-0.5 rounded text-[10px] font-medium text-[var(--text-secondary)] hover:bg-gray-100">No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmSlot(slot.id)}
                                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {mySlots.some(s => bookedSlotIds.has(s.id)) && (
              <div className="mt-5 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Booked slots cannot be removed. Cancel the booking first from the Bookings tab.</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Reschedule Modal ── */}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={e => { if (e.target === e.currentTarget) setRescheduleModal(null) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Reschedule Booking</h2>
              <button onClick={() => setRescheduleModal(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-[var(--text-primary)]">{rescheduleModal.studentName}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{rescheduleModal.presentationTopic}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                  Current: {format(parseISO(rescheduleModal.date), 'EEE, dd MMM yyyy')} at {formatTime(rescheduleModal.time)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">New Date</label>
                <input type="date" min={today} value={rescheduleDate}
                  onChange={e => { setRescheduleDate(e.target.value); setRescheduleSlotId(''); setRescheduleError('') }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              {rescheduleDate && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Available Time Slots</label>
                  {availableSlotsForReschedule.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-2">No available slots on this date for your class.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlotsForReschedule.map(slot => (
                        <button key={slot.id} onClick={() => setRescheduleSlotId(slot.id)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${rescheduleSlotId === slot.id ? 'border-[var(--accent)] bg-blue-50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'}`}>
                          {formatTime(slot.time)}<span className="text-xs text-[var(--text-muted)] ml-1">· {slot.duration}m</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {rescheduleError && <p className="text-xs text-red-500">{rescheduleError}</p>}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setRescheduleModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleReschedule} disabled={!rescheduleSlotId || rescheduleLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {rescheduleLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
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
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Note</h2>
              <button onClick={() => setCommentModal(null)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm">
                <p className="font-medium text-[var(--text-primary)]">{commentModal.studentName}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{format(parseISO(commentModal.date), 'EEE, dd MMM yyyy')} at {formatTime(commentModal.time)} · {commentModal.presentationTopic}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Internal note (not visible to students)</label>
                <textarea value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
                  placeholder="Add a note about this booking…" rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setCommentModal(null)} className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSaveComment} disabled={commentLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {commentLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Booking Modal ── */}
      {addBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={e => { if (e.target === e.currentTarget) setAddBookingOpen(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Add Booking</h2>
              <button onClick={() => setAddBookingOpen(false)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddBooking} className="p-5 space-y-4">
              {/* Date + slot */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Date</label>
                  <input type="date" min={today} value={addDate}
                    onChange={e => { setAddDate(e.target.value); setAddSlotId('') }}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Time Slot</label>
                  {addDate ? (
                    addBookingSlotsForDate.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] pt-2">No available slots on this date.</p>
                    ) : (
                      <select value={addSlotId} onChange={e => setAddSlotId(e.target.value)} required
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white">
                        <option value="">— Select —</option>
                        {addBookingSlotsForDate.map(s => (
                          <option key={s.id} value={s.id}>{formatTime(s.time)} · {s.duration}m</option>
                        ))}
                      </select>
                    )
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] pt-2">Pick a date first.</p>
                  )}
                </div>
              </div>

              {/* Student details */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Student Name</label>
                <input type="text" value={addStudentName} onChange={e => setAddStudentName(e.target.value)}
                  placeholder="Full name" required maxLength={100}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Student Email</label>
                <input type="email" value={addStudentEmail} onChange={e => setAddStudentEmail(e.target.value)}
                  placeholder="student@example.com" required maxLength={254}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Presentation Topic</label>
                <input type="text" value={addTopic} onChange={e => setAddTopic(e.target.value)}
                  placeholder="Topic title" required maxLength={200}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              </div>
              {adminSettings.bookingPurposes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Purpose</label>
                  <select value={addPurpose} onChange={e => setAddPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-white">
                    {adminSettings.bookingPurposes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Notes <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
                <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)}
                  placeholder="Any additional notes…" rows={2} maxLength={500}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none" />
              </div>

              {addError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{addError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setAddBookingOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {addLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {addLoading ? 'Saving…' : 'Add Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
