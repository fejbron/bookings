import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRight, CalendarDays, Check, FileText, Mail, Presentation, User, AlertCircle } from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import Calendar from '../components/Calendar'
import TimeSlots, { formatTime } from '../components/TimeSlots'
import type { PresentationSlot } from '../types'

const STEP_LABELS = ['Date', 'Time', 'Details']

export default function Book() {
  const navigate = useNavigate()
  const { getAvailableDates, getAvailableSlots, bookSlot } = useBookings()

  const [step, setStep] = useState(0)
  const [date, setDate] = useState<Date | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [presentationTopic, setPresentationTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const availableDates = useMemo(() => getAvailableDates(), [getAvailableDates])
  const slotsForDate = useMemo(
    () => (date ? getAvailableSlots(format(date, 'yyyy-MM-dd')) : []),
    [date, getAvailableSlots],
  )
  const selectedSlot: PresentationSlot | null = useMemo(
    () => slotsForDate.find(s => s.id === slotId) ?? null,
    [slotsForDate, slotId],
  )

  const canNext = (() => {
    if (step === 0) return !!date
    if (step === 1) return !!slotId
    if (step === 2) return !!name.trim() && !!email.trim() && !!presentationTopic.trim()
    return false
  })()

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Full name is required.'
    if (!email.trim()) newErrors.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = 'Please enter a valid email.'
    if (!presentationTopic.trim()) newErrors.topic = 'Presentation topic is required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleConfirm() {
    if (!slotId || !validateForm()) return
    setSubmitting(true)
    try {
      await bookSlot(slotId, {
        studentName: name.trim(),
        studentEmail: email.trim(),
        presentationTopic: presentationTopic.trim(),
        notes: notes.trim(),
      })
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[var(--border)] p-10 max-w-md w-full text-center animate-scale-in">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
            <Check className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Booking Confirmed!</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your presentation on{' '}
            <span className="font-medium text-[var(--text-primary)]">{date && format(date, 'EEEE, MMMM d')}</span>{' '}
            at <span className="font-medium text-[var(--text-primary)]">{selectedSlot && formatTime(selectedSlot.time)}</span> is booked.
          </p>
          <div className="mt-8 flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full bg-[var(--accent)] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
            >
              View My Bookings
            </button>
            <button
              onClick={() => {
                setSubmitted(false); setStep(0); setDate(null); setSlotId(null)
                setName(''); setEmail(''); setPresentationTopic(''); setNotes(''); setErrors({})
              }}
              className="w-full text-[var(--text-secondary)] py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors border border-[var(--border)]"
            >
              Book Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Book a Presentation Slot</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Pick from dates and times set by the admin.</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div className="flex-1">
                <div className={`h-1 rounded-full transition-all ${i <= step ? 'bg-[var(--accent)]' : 'bg-gray-200'}`} />
                <span className={`block text-xs mt-1.5 font-medium ${i <= step ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Step 0 — Date */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Pick a Date</h2>
              {date && (
                <span className="text-xs text-[var(--text-muted)] bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                  {slotsForDate.length} slot{slotsForDate.length !== 1 ? 's' : ''} available
                </span>
              )}
            </div>
            <Calendar selected={date} onSelect={setDate} availableDates={availableDates} />
            {availableDates.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2.5 rounded-lg flex items-center gap-2 border border-amber-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No slots available yet. Ask your admin to generate presentation slots.
              </p>
            )}
            {date && (
              <p className="text-sm text-[var(--accent)] font-medium flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                {format(date, 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
        )}

        {/* Step 1 — Time */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Select a Time
                {date && <span className="text-sm font-normal text-[var(--text-muted)] ml-2">{format(date, 'MMM d')}</span>}
              </h2>
              <span className="text-xs text-[var(--text-muted)] bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {slotsForDate.length} available
              </span>
            </div>
            <TimeSlots slots={slotsForDate} selected={slotId} onSelect={setSlotId} />
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in-up">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Your Details</h2>

            {/* Booking summary */}
            <div className="bg-[var(--accent-light)] rounded-xl p-4 text-sm border border-orange-100">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-[var(--text-muted)]">Date</span>
                <span className="font-medium text-[var(--text-primary)]">{date && format(date, 'EEE, MMM d, yyyy')}</span>
                <span className="text-[var(--text-muted)]">Time</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedSlot && formatTime(selectedSlot.time)}</span>
                <span className="text-[var(--text-muted)]">Duration</span>
                <span className="font-semibold text-[var(--accent)]">{selectedSlot?.duration} min</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[var(--border)] p-5 space-y-4">
              {[
                { icon: User, label: 'Full Name', key: 'name', type: 'text', val: name, setter: setName, placeholder: 'John Doe', err: errors.name, maxLength: 100 },
                { icon: Mail, label: 'Email', key: 'email', type: 'email', val: email, setter: setEmail, placeholder: 'student@example.com', err: errors.email, maxLength: 254 },
                { icon: Presentation, label: 'Presentation Topic', key: 'topic', type: 'text', val: presentationTopic, setter: setPresentationTopic, placeholder: 'e.g. Final Year Project Demo', err: errors.topic, maxLength: 200 },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                    <field.icon className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={field.val}
                    onChange={e => { field.setter(e.target.value); setErrors(prev => ({ ...prev, [field.key]: '' })) }}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition ${field.err ? 'border-red-300' : 'border-[var(--border)]'}`}
                  />
                  {field.err && <p className="mt-1 text-xs text-red-500">{field.err}</p>}
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything we should know?"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-100 transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!canNext || submitting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> {submitting ? 'Confirming…' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
