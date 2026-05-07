import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Check, Clock, CalendarDays,
  Mail, User, AlertCircle, ChevronRight,
  Globe, ChevronLeft, Zap, Users,
} from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import { useAuth } from '../context/AuthContext'
import Calendar from '../components/Calendar'
import TimeSlots, { formatTime } from '../components/TimeSlots'
import type { PresentationSlot } from '../types'

type View = 'type' | 'lecturer' | 'select' | 'confirm'

const COLOR_BG: Record<string, string> = {
  blue: '#006BFF', purple: '#7C3AED', green: '#059669',
  orange: '#EA580C', pink: '#DB2777', teal: '#0891B2', grey: '#4B5563',
}

const COLOR_LIGHT: Record<string, string> = {
  blue: '#EBF3FF', purple: '#EDE9FE', green: '#D1FAE5',
  orange: '#FED7AA', pink: '#FCE7F3', teal: '#CFFAFE', grey: '#F3F4F6',
}

export default function Book() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { slots, getAvailableDates, getAvailableSlots, getLecturersForType, bookSlot, adminSettings, getCalendarTypes, calendarTypeRecords } = useBookings()
  const { lecturers, loadLecturers } = useAuth()

  useEffect(() => {
    loadLecturers().catch(() => {})
  }, [loadLecturers])

  function getTypeMeta(typeName: string | null) {
    const record = calendarTypeRecords.find(t => t.name === typeName)
    const color = record?.color ?? 'blue'
    return {
      bg: COLOR_BG[color] ?? '#006BFF',
      light: COLOR_LIGHT[color] ?? '#EBF3FF',
      color,
    }
  }

  const [view, setView] = useState<View>('type')
  const [calendarType, setCalendarType] = useState<string | null>(null)
  const [selectedLecturerName, setSelectedLecturerName] = useState<string | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [presentationTopic, setPresentationTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const calendarTypes = useMemo(() => getCalendarTypes(), [getCalendarTypes])
  const availableDates = useMemo(
    () => getAvailableDates(calendarType ?? undefined, selectedLecturerName ?? undefined),
    [getAvailableDates, calendarType, selectedLecturerName],
  )
  const slotsForDate = useMemo(
    () => (date ? getAvailableSlots(format(date, 'yyyy-MM-dd'), calendarType ?? undefined, selectedLecturerName ?? undefined) : []),
    [date, getAvailableSlots, calendarType, selectedLecturerName],
  )
  const selectedSlot: PresentationSlot | null = useMemo(
    () => slotsForDate.find(s => s.id === slotId) ?? null,
    [slotsForDate, slotId],
  )

  // Pre-select type from URL param or if only one exists
  useEffect(() => {
    const urlType = searchParams.get('type')
    const type = (urlType && calendarTypes.includes(urlType)) ? urlType
      : calendarTypes.length <= 1 ? (calendarTypes[0] ?? null) : null
    if (!type) return
    setCalendarType(type)
    const available = getLecturersForType(type)
    if (available.length > 1) {
      setView('lecturer')
    } else {
      setSelectedLecturerName(available[0] ?? null)
      setView('select')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarTypes.length])

  function handleSelectType(type: string) {
    setCalendarType(type)
    setSelectedLecturerName(null)
    setDate(null)
    setSlotId(null)
    const available = getLecturersForType(type)
    if (available.length > 1) {
      setView('lecturer')
    } else {
      setSelectedLecturerName(available[0] ?? null)
      setView('select')
    }
  }

  function handleSelectLecturer(name: string) {
    setSelectedLecturerName(name)
    setDate(null)
    setSlotId(null)
    setView('select')
  }

  function handleDateSelect(d: Date) {
    setDate(d)
    setSlotId(null)
  }

  const isTopicHidden = ['Office Meeting', 'Other', 'Personal'].includes(calendarType ?? '')

  function validateForm(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Full name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email.'
    if (!isTopicHidden && !presentationTopic.trim()) e.topic = 'Topic is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleConfirm() {
    if (!slotId || !validateForm()) return
    setSubmitting(true)
    setBookingError('')
    try {
      await bookSlot(slotId, {
        studentName: name.trim(),
        studentEmail: email.trim(),
        presentationTopic: isTopicHidden ? 'Office Meeting' : presentationTopic.trim(),
        notes: notes.trim(),
      })
      setSubmitted(true)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
    setView(calendarTypes.length > 1 ? 'type' : 'select')
    setCalendarType(calendarTypes.length <= 1 ? (calendarTypes[0] ?? null) : null)
    setSelectedLecturerName(null)
    setDate(null); setSlotId(null)
    setName(''); setEmail(''); setPresentationTopic(''); setNotes('')
    setErrors({}); setBookingError(''); setSubmitted(false)
  }

  const activeMeta = getTypeMeta(calendarType)

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 max-w-sm w-full text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-emerald-950/40 border border-emerald-900/40">
            <Check style={{ width: 28, height: 28, color: '#34D399' }} />
          </div>
          <h2 className="text-xl font-bold text-white">You're booked!</h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Your{calendarType ? ` ${calendarType.toLowerCase()}` : ''} on{' '}
            <span className="font-semibold text-white">{date && format(date, 'EEEE, MMMM d')}</span>{' '}
            at{' '}
            <span className="font-semibold text-white">{selectedSlot && formatTime(selectedSlot.time)}</span>{' '}
            has been received.
          </p>

          <div className="mt-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CalendarDays style={{ width: 13, height: 13 }} />
              {date && format(date, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock style={{ width: 13, height: 13 }} />
              {selectedSlot && formatTime(selectedSlot.time)} · {selectedSlot?.duration} min
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Globe style={{ width: 13, height: 13 }} />
              Africa/Accra
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              View my bookings
            </button>
            <button
              onClick={resetAll}
              className="w-full text-zinc-300 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              Book another slot
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Type selection ──────────────────────────────────────────────────────────
  if (view === 'type') {
    return (
      <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-8 py-10 sm:py-16">
        <div className="w-full max-w-md animate-fade-in-up space-y-3">
          {/* Profile card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="w-16 h-16 rounded-full bg-zinc-700 text-white flex items-center justify-center text-xl font-bold mb-4">
              BS
            </div>
            <h1 className="text-lg font-bold text-white">BookSlot</h1>
            {adminSettings.welcomeMessage && (
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{adminSettings.welcomeMessage}</p>
            )}
          </div>

          {/* Event types card */}
          {calendarTypes.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-2 text-sm text-amber-400">
              <AlertCircle style={{ width: 16, height: 16 }} className="flex-shrink-0 mt-0.5" />
              No booking types available yet. Check back later.
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800 overflow-hidden">
              {calendarTypes.map(type => {
                const typeRecord = calendarTypeRecords.find(r => r.name === type)
                const slotsForType = slots.filter((s: PresentationSlot) => s.calendarType === type)
                const duration = slotsForType[0]?.duration ?? 30
                const count = getAvailableDates(type).reduce((acc, d) =>
                  acc + getAvailableSlots(d, type).length, 0)

                return (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    disabled={count === 0}
                    className="w-full p-5 text-left hover:bg-zinc-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <p className="text-base font-semibold text-white mb-2">{type}</p>
                    {typeRecord?.description && (
                      <p className="text-sm text-zinc-500 mb-2 leading-relaxed line-clamp-2">{typeRecord.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-400">
                        <Clock style={{ width: 12, height: 12 }} />
                        {duration}m
                      </div>
                      {count === 0 && (
                        <span className="text-xs text-zinc-600">No slots</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── VIEW: lecturer selection ────────────────────────────────────────────────
  if (view === 'lecturer') {
    const lecturerNames = getLecturersForType(calendarType ?? undefined)
    return (
      <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-8 py-10 sm:py-16">
        <div className="w-full max-w-md animate-fade-in-up space-y-3">
          {calendarTypes.length > 1 && (
            <button
              onClick={() => setView('type')}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-1"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
              Back to session types
            </button>
          )}

          {/* Header card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h1 className="text-lg font-bold text-white">Choose a team member</h1>
            <p className="mt-1 text-sm text-zinc-400">{calendarType} · pick who you'd like to meet with</p>
          </div>

          {/* Lecturers card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800 overflow-hidden">
            {lecturerNames.map(name => {
              const profile = lecturers.find(l => l.name.toLowerCase() === name.toLowerCase())
              const slotCount = getAvailableDates(calendarType ?? undefined, name)
                .reduce((acc, d) => acc + getAvailableSlots(d, calendarType ?? undefined, name).length, 0)
              const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

              return (
                <button
                  key={name}
                  onClick={() => handleSelectLecturer(name)}
                  className="w-full p-5 text-left hover:bg-zinc-800/50 transition-colors flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-700 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white">{name}</p>
                    {profile?.classGroup && (
                      <p className="text-xs text-zinc-500 mt-0.5">{profile.classGroup}</p>
                    )}
                    {profile?.description && (
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{profile.description}</p>
                    )}
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 mt-2 bg-zinc-800 rounded-md text-xs font-medium text-zinc-400">
                      <Clock style={{ width: 12, height: 12 }} />
                      {slotCount > 0 ? `${slotCount} slot${slotCount !== 1 ? 's' : ''}` : 'No slots'}
                    </div>
                  </div>
                  <ChevronRight
                    style={{ width: 18, height: 18 }}
                    className="text-zinc-600 flex-shrink-0"
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Booking layout (select + confirm share same outer shell) ─────────────────
  const hasLecturerStep = getLecturersForType(calendarType ?? undefined).length > 1

  // Organizer info panel (left column)
  const OrganizerPanel = (
    <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-800 md:w-64 flex-shrink-0">
      {(calendarTypes.length > 1 || hasLecturerStep) && (
        <button
          onClick={() => hasLecturerStep ? setView('lecturer') : setView('type')}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          {hasLecturerStep ? 'All team members' : 'All types'}
        </button>
      )}

      <div className="w-10 h-10 rounded-full bg-zinc-700 text-white flex items-center justify-center text-sm font-bold mb-4">
        BS
      </div>

      {calendarType && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 bg-zinc-800 text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeMeta.bg }} />
          {calendarType}
        </div>
      )}

      {selectedLecturerName && (
        <div className="flex items-center gap-2 mt-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-zinc-700 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {selectedLecturerName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <span className="text-xs font-medium text-zinc-300 truncate">{selectedLecturerName}</span>
        </div>
      )}

      <h2 className="text-base font-bold text-white leading-snug mb-4 mt-2">
        {adminSettings.welcomeMessage || 'Book a Session'}
      </h2>

      <div className="space-y-2.5 text-sm text-zinc-400">
        {selectedSlot && (
          <div className="flex items-center gap-2">
            <Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span>{selectedSlot.duration} min</span>
          </div>
        )}
        {date && (
          <div className="flex items-center gap-2">
            <CalendarDays style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
          </div>
        )}
        {selectedSlot && (
          <div className="flex items-center gap-2">
            <Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span className="font-semibold text-white">{formatTime(selectedSlot.time)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Globe style={{ width: 14, height: 14 }} className="flex-shrink-0" />
          <span className="text-xs">Africa/Accra</span>
        </div>
      </div>
    </div>
  )

  // ── VIEW: select ────────────────────────────────────────────────────────────
  if (view === 'select') {
    return (
      <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row">
          {OrganizerPanel}

          {/* Calendar */}
          <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-5">Select a date</h3>
            {availableDates.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-950/30 border border-amber-900/40 px-4 py-3 rounded-xl">
                <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0 mt-0.5" />
                No slots available yet for this session type.
              </div>
            ) : (
              <Calendar
                selected={date}
                onSelect={handleDateSelect}
                availableDates={availableDates}
                dark
              />
            )}
          </div>

          {/* Time slots */}
          <div className={`md:w-52 flex-shrink-0 transition-all duration-200 ${date ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {date && (
              <div className="p-6 md:p-8 flex flex-col h-full animate-slide-in-right">
                <h3 className="text-sm font-semibold text-white mb-0.5">{format(date, 'EEEE')}</h3>
                <p className="text-xs text-zinc-500 mb-5">{format(date, 'MMMM d, yyyy')}</p>

                <div className="flex-1 overflow-y-auto max-h-80">
                  <TimeSlots slots={slotsForDate} selected={slotId} onSelect={setSlotId} dark />
                </div>

                {slotId && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 animate-fade-in">
                    <button
                      onClick={() => setView('confirm')}
                      className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
                    >
                      Confirm time →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── VIEW: confirm ────────────────────────────────────────────────────────────
  const canSubmit = !!name.trim() && !!email.trim() && (isTopicHidden || !!presentationTopic.trim())

  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-6 py-8 sm:py-12">
      <div className="w-full max-w-3xl bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row animate-fade-in">
        {/* Left summary */}
        <div className="md:w-64 flex-shrink-0 p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-800">
          <button
            onClick={() => setView('select')}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
            Back
          </button>

          <div className="w-10 h-10 rounded-full bg-zinc-700 text-white flex items-center justify-center text-sm font-bold mb-4">
            BS
          </div>

          {calendarType && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 bg-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeMeta.bg }} />
              {calendarType}
            </div>
          )}

          <h2 className="text-base font-bold text-white mb-4 mt-1">
            {adminSettings.welcomeMessage || 'Book a Session'}
          </h2>

          <div className="space-y-2.5 text-sm text-zinc-400">
            {selectedLecturerName && (
              <div className="flex items-center gap-2">
                <Users style={{ width: 14, height: 14 }} className="flex-shrink-0" />
                <span>{selectedLecturerName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" />
              <span>{selectedSlot?.duration} min</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays style={{ width: 14, height: 14 }} className="flex-shrink-0" />
              <span>{date && format(date, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" />
              <span className="font-semibold text-white">
                {selectedSlot && formatTime(selectedSlot.time)}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Globe style={{ width: 14, height: 14 }} className="flex-shrink-0" />
              <span className="text-xs">Africa/Accra</span>
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 p-6 md:p-8">
          <h2 className="text-[15px] font-semibold text-white mb-5">Enter your details</h2>

          <div className="space-y-4">
            {[
              {
                icon: User, label: 'Full name', key: 'name', type: 'text',
                val: name, set: setName, placeholder: 'Your full name', err: errors.name,
              },
              {
                icon: Mail, label: 'Email address', key: 'email', type: 'email',
                val: email, set: setEmail, placeholder: 'you@example.com', err: errors.email,
              },
              ...(!isTopicHidden ? [{
                icon: Zap, label: 'Presentation topic', key: 'topic', type: 'text',
                val: presentationTopic, set: setPresentationTopic,
                placeholder: 'e.g. Final Year Project Demo', err: errors.topic,
              }] : []),
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => { f.set(e.target.value); setErrors(prev => ({ ...prev, [f.key]: '' })) }}
                  placeholder={f.placeholder}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition bg-zinc-950 ${
                    f.err ? 'border-red-700 bg-red-950/30' : 'border-zinc-800'
                  }`}
                />
                {f.err && <p className="mt-1 text-xs text-red-400">{f.err}</p>}
              </div>
            ))}

            {!isTopicHidden && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Additional notes <span className="font-normal text-zinc-600">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything we should know?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition resize-none"
                />
              </div>
            )}
          </div>

          {bookingError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/40 px-4 py-3 rounded-xl">
              <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0" />
              {bookingError}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleConfirm}
              disabled={!canSubmit || submitting}
              className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Confirming…' : 'Confirm booking'}
            </button>
            <p className="text-xs text-zinc-600 text-center mt-3">
              By booking, you agree to this appointment being recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
