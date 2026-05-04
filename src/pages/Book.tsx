import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft, CalendarDays, Check, Clock, FileText,
  Mail, Presentation, User, AlertCircle, Tag, ChevronRight,
} from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import Calendar from '../components/Calendar'
import TimeSlots, { formatTime } from '../components/TimeSlots'
import type { PresentationSlot } from '../types'

type View = 'select' | 'confirm'

export default function Book() {
  const navigate = useNavigate()
  const { getAvailableDates, getAvailableSlots, bookSlot, adminSettings } = useBookings()

  const [view, setView] = useState<View>('select')
  const [date, setDate] = useState<Date | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [presentationTopic, setPresentationTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [bookingPurpose, setBookingPurpose] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const availableDates = useMemo(() => getAvailableDates(), [getAvailableDates])
  const slotsForDate = useMemo(
    () => (date ? getAvailableSlots(format(date, 'yyyy-MM-dd')) : []),
    [date, getAvailableSlots],
  )
  const selectedSlot: PresentationSlot | null = useMemo(
    () => slotsForDate.find(s => s.id === slotId) ?? null,
    [slotsForDate, slotId],
  )

  function handleDateSelect(d: Date) {
    setDate(d)
    setSlotId(null)
  }

  function validateForm(): boolean {
    const e: Record<string, string> = {}
    if (adminSettings.bookingPurposes.length > 0 && !bookingPurpose) e.purpose = 'Please select a purpose.'
    if (!name.trim()) e.name = 'Full name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email.'
    if (!presentationTopic.trim()) e.topic = 'Presentation topic is required.'
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
        presentationTopic: presentationTopic.trim(),
        notes: notes.trim(),
        bookingPurpose,
      })
      setSubmitted(true)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
    setView('select'); setDate(null); setSlotId(null)
    setName(''); setEmail(''); setPresentationTopic(''); setNotes(''); setBookingPurpose('')
    setErrors({}); setBookingError(''); setSubmitted(false)
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-page)]">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-10 max-w-sm w-full text-center animate-scale-in" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="w-14 h-14 rounded-full bg-[var(--status-confirmed-bg)] text-[var(--status-confirmed)] flex items-center justify-center mx-auto mb-5">
            <Check className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">You're booked!</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            Your presentation on{' '}
            <span className="font-semibold text-[var(--text-primary)]">{date && format(date, 'EEEE, MMMM d')}</span>{' '}
            at{' '}
            <span className="font-semibold text-[var(--text-primary)]">{selectedSlot && formatTime(selectedSlot.time)}</span>{' '}
            is confirmed.
          </p>
          <div className="mt-8 space-y-2.5">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full bg-[var(--accent)] text-white py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
            >
              View My Bookings
            </button>
            <button
              onClick={resetAll}
              className="w-full text-[var(--text-secondary)] py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 border border-[var(--border)] transition-colors"
            >
              Book Another Slot
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Shared left info panel ──────────────────────────────────────────────────
  const InfoPanel = (
    <div className="flex flex-col gap-5 p-6 md:p-8">
      <div>
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
          <Presentation className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
          Presentation Booking
        </p>
        <h1 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
          {adminSettings.welcomeMessage || 'Book a Slot'}
        </h1>
      </div>

      {(date || selectedSlot) && (
        <div className="space-y-2.5 text-sm text-[var(--text-secondary)]">
          {selectedSlot && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span>{selectedSlot.duration} min</span>
            </div>
          )}
          {date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
            </div>
          )}
          {selectedSlot && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="font-semibold text-[var(--text-primary)]">{formatTime(selectedSlot.time)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ── VIEW: select (Calendly 3-column) ────────────────────────────────────────
  if (view === 'select') {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-start justify-center p-4 sm:p-8 py-8 sm:py-12">
        <div
          className="w-full max-w-5xl bg-white rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col lg:flex-row"
          style={{ boxShadow: 'var(--card-shadow)' }}
        >
          {/* Left panel */}
          <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
            {InfoPanel}
          </div>

          {/* Center — Calendar */}
          <div className="flex-1 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5">Select a Date</h2>
            {availableDates.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                No slots available yet. Ask your admin to generate presentation slots.
              </div>
            ) : (
              <Calendar
                selected={date}
                onSelect={handleDateSelect}
                availableDates={availableDates}
              />
            )}
          </div>

          {/* Right — Time slots (appears after date selected) */}
          <div className={`lg:w-56 shrink-0 flex flex-col transition-all duration-300 ${date ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {date && (
              <div className="p-6 md:p-8 flex flex-col h-full animate-slide-in-right">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{format(date, 'EEEE')}</h2>
                <p className="text-xs text-[var(--text-muted)] mb-5">{format(date, 'MMMM d, yyyy')}</p>

                <div className="flex-1 overflow-y-auto max-h-80 space-y-0 pr-0.5">
                  <TimeSlots slots={slotsForDate} selected={slotId} onSelect={setSlotId} />
                </div>

                {slotId && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] animate-fade-in">
                    <button
                      onClick={() => setView('confirm')}
                      className="w-full flex items-center justify-center gap-1.5 bg-[var(--accent)] text-white py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Confirm time
                      <ChevronRight className="w-4 h-4" />
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

  // ── VIEW: confirm (2-column) ────────────────────────────────────────────────
  const canSubmit = !!name.trim() && !!email.trim() && !!presentationTopic.trim() &&
    (adminSettings.bookingPurposes.length === 0 || !!bookingPurpose)

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-start justify-center p-4 sm:p-8 py-8 sm:py-12">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col md:flex-row animate-fade-in"
        style={{ boxShadow: 'var(--card-shadow)' }}
      >
        {/* Left — summary */}
        <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)]">
          <div className="p-6 md:p-8 flex flex-col h-full">
            <button
              onClick={() => setView('select')}
              className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="w-10 h-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
              <Presentation className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Presentation Booking
            </p>
            <h1 className="text-base font-bold text-[var(--text-primary)] mb-5">
              {adminSettings.welcomeMessage || 'Book a Slot'}
            </h1>

            <div className="space-y-3 text-sm text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span>{selectedSlot?.duration} min</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span>{date && format(date, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedSlot && formatTime(selectedSlot.time)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex-1 p-6 md:p-8">
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-6">Your Information</h2>

          <div className="space-y-4">
            {/* Purpose chips */}
            {adminSettings.bookingPurposes.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Purpose
                </label>
                <div className="flex flex-wrap gap-2">
                  {adminSettings.bookingPurposes.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setBookingPurpose(p); setErrors(prev => ({ ...prev, purpose: '' })) }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${
                        bookingPurpose === p
                          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {errors.purpose && <p className="mt-1.5 text-xs text-red-500">{errors.purpose}</p>}
              </div>
            )}

            {/* Text fields */}
            {[
              { icon: User, label: 'Full Name', key: 'name', type: 'text', val: name, set: setName, placeholder: 'John Doe', err: errors.name },
              { icon: Mail, label: 'Email Address', key: 'email', type: 'email', val: email, set: setEmail, placeholder: 'student@example.com', err: errors.email },
              { icon: Presentation, label: 'Presentation Topic', key: 'topic', type: 'text', val: presentationTopic, set: setPresentationTopic, placeholder: 'e.g. Final Year Project Demo', err: errors.topic },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <f.icon className="w-3.5 h-3.5" /> {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => { f.set(e.target.value); setErrors(prev => ({ ...prev, [f.key]: '' })) }}
                  placeholder={f.placeholder}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition ${f.err ? 'border-red-300 bg-red-50' : 'border-[var(--border)]'}`}
                />
                {f.err && <p className="mt-1 text-xs text-red-500">{f.err}</p>}
              </div>
            ))}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Anything we should know?"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition resize-none"
              />
            </div>
          </div>

          {bookingError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {bookingError}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleConfirm}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 bg-[var(--accent)] text-white px-7 py-2.5 rounded-full text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Confirming…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
