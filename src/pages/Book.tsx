import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Check, Clock, CalendarDays,
  Mail, User, AlertCircle, ChevronRight,
  Globe, ChevronLeft, Zap,
} from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import Calendar from '../components/Calendar'
import TimeSlots, { formatTime } from '../components/TimeSlots'
import type { PresentationSlot } from '../types'

type View = 'type' | 'select' | 'confirm'

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
  const { getAvailableDates, getAvailableSlots, bookSlot, adminSettings, getCalendarTypes, calendarTypeRecords } = useBookings()

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
    () => getAvailableDates(calendarType ?? undefined),
    [getAvailableDates, calendarType],
  )
  const slotsForDate = useMemo(
    () => (date ? getAvailableSlots(format(date, 'yyyy-MM-dd'), calendarType ?? undefined) : []),
    [date, getAvailableSlots, calendarType],
  )
  const selectedSlot: PresentationSlot | null = useMemo(
    () => slotsForDate.find(s => s.id === slotId) ?? null,
    [slotsForDate, slotId],
  )

  // Pre-select type from URL param or if only one exists
  useEffect(() => {
    const urlType = searchParams.get('type')
    if (urlType && calendarTypes.includes(urlType)) {
      setCalendarType(urlType)
      setView('select')
    } else if (calendarTypes.length <= 1) {
      setCalendarType(calendarTypes[0] ?? null)
      setView('select')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarTypes.length])

  function handleSelectType(type: string) {
    setCalendarType(type)
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
    setDate(null); setSlotId(null)
    setName(''); setEmail(''); setPresentationTopic(''); setNotes('')
    setErrors({}); setBookingError(''); setSubmitted(false)
  }

  const activeMeta = getTypeMeta(calendarType)

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-sm w-full text-center animate-scale-in shadow-md">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: '#F0FDF4' }}
          >
            <Check style={{ width: 28, height: 28, color: '#16A34A' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">You're booked!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Your{calendarType ? ` ${calendarType.toLowerCase()}` : ''} on{' '}
            <span className="font-semibold text-gray-900">{date && format(date, 'EEEE, MMMM d')}</span>{' '}
            at{' '}
            <span className="font-semibold text-gray-900">{selectedSlot && formatTime(selectedSlot.time)}</span>{' '}
            has been confirmed.
          </p>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <CalendarDays style={{ width: 13, height: 13 }} />
              {date && format(date, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock style={{ width: 13, height: 13 }} />
              {selectedSlot && formatTime(selectedSlot.time)} · {selectedSlot?.duration} min
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Globe style={{ width: 13, height: 13 }} />
              Africa/Accra
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              View my bookings
            </button>
            <button
              onClick={resetAll}
              className="w-full text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 border border-gray-200 transition-colors"
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
      <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 sm:p-8 py-10 sm:py-16">
        <div className="w-full max-w-lg animate-fade-in-up">
          {/* Profile mini */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold mx-auto mb-3">
              BS
            </div>
            <h1 className="text-xl font-bold text-gray-900">What would you like to book?</h1>
            <p className="mt-1 text-sm text-gray-500">Choose a session type to see available times.</p>
          </div>

          {calendarTypes.length === 0 ? (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 px-5 py-4 rounded-xl">
              <AlertCircle style={{ width: 16, height: 16 }} className="flex-shrink-0 mt-0.5" />
              No booking types available yet. Check back later.
            </div>
          ) : (
            <div className="space-y-3">
              {calendarTypes.map(type => {
                const meta = getTypeMeta(type)
                const count = getAvailableDates(type).reduce((acc, d) =>
                  acc + getAvailableSlots(d, type).length, 0)

                return (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className="w-full group flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all text-left"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: meta.bg }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900">{type}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {count > 0
                          ? `${count} slot${count !== 1 ? 's' : ''} available`
                          : 'No slots available'}
                      </p>
                    </div>
                    <ChevronRight
                      style={{ width: 18, height: 18 }}
                      className="text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0"
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Booking layout (select + confirm share same outer shell) ─────────────────
  // Organizer info panel (left column)
  const OrganizerPanel = (
    <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 md:w-64 flex-shrink-0">
      {calendarTypes.length > 1 && (
        <button
          onClick={() => setView('type')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          All types
        </button>
      )}

      <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold mb-4">
        BS
      </div>

      {calendarType && (
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2"
          style={{ background: activeMeta.light, color: activeMeta.bg }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: activeMeta.bg }}
          />
          {calendarType}
        </div>
      )}

      <h2 className="text-base font-bold text-gray-900 leading-snug mb-4">
        {adminSettings.welcomeMessage || 'Book a Session'}
      </h2>

      <div className="space-y-2.5 text-sm text-gray-500">
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
            <span className="font-semibold text-gray-900">{formatTime(selectedSlot.time)}</span>
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
      <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 sm:p-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
          {OrganizerPanel}

          {/* Calendar */}
          <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Select a date</h3>
            {availableDates.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl">
                <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0 mt-0.5" />
                No slots available yet for this session type.
              </div>
            ) : (
              <Calendar
                selected={date}
                onSelect={handleDateSelect}
                availableDates={availableDates}
              />
            )}
          </div>

          {/* Time slots */}
          <div className={`md:w-52 flex-shrink-0 transition-all duration-200 ${date ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {date && (
              <div className="p-6 md:p-8 flex flex-col h-full animate-slide-in-right">
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{format(date, 'EEEE')}</h3>
                <p className="text-xs text-gray-400 mb-5">{format(date, 'MMMM d, yyyy')}</p>

                <div className="flex-1 overflow-y-auto max-h-80">
                  <TimeSlots slots={slotsForDate} selected={slotId} onSelect={setSlotId} />
                </div>

                {slotId && (
                  <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                    <button
                      onClick={() => setView('confirm')}
                      className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
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
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 sm:p-6 py-8 sm:py-12">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col md:flex-row animate-fade-in">
        {/* Left summary */}
        <div className="md:w-64 flex-shrink-0 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100">
          <button
            onClick={() => setView('select')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors"
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
            Back
          </button>

          <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold mb-4">
            BS
          </div>

          {calendarType && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2"
              style={{ background: activeMeta.light, color: activeMeta.bg }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: activeMeta.bg }} />
              {calendarType}
            </div>
          )}

          <h2 className="text-base font-bold text-gray-900 mb-5">
            {adminSettings.welcomeMessage || 'Book a Session'}
          </h2>

          <div className="space-y-2.5 text-sm text-gray-500">
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
              <span className="font-semibold text-gray-900">
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
          <h2 className="text-[15px] font-semibold text-gray-900 mb-5">Enter your details</h2>

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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => { f.set(e.target.value); setErrors(prev => ({ ...prev, [f.key]: '' })) }}
                  placeholder={f.placeholder}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition ${
                    f.err ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {f.err && <p className="mt-1 text-xs text-red-500">{f.err}</p>}
              </div>
            ))}

            {!isTopicHidden && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Additional notes <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything we should know?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition resize-none"
                />
              </div>
            )}
          </div>

          {bookingError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0" />
              {bookingError}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleConfirm}
              disabled={!canSubmit || submitting}
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Confirming…' : 'Confirm booking'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              By booking, you agree to this appointment being recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
