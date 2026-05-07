import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ArrowRight, Clock, Inbox, Search, X, AlertCircle, Timer, MapPin } from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import { formatTime } from '../components/TimeSlots'

export default function MyBookings() {
  const { getStudentBookings, cancelBooking, adminSettings } = useBookings()
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [activeTab, setActiveTab] = useState<'upcoming' | 'cancelled'>('upcoming')

  const bookings = useMemo(
    () => (submittedEmail ? getStudentBookings(submittedEmail) : []),
    [submittedEmail, getStudentBookings],
  )
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setSubmittedEmail(email.trim())
  }

  async function handleCancel(id: string) {
    await cancelBooking(id, cancelReason)
    setCancelConfirmId(null)
    setCancelReason('')
  }

  function openCancel(id: string) {
    setCancelConfirmId(id)
    setCancelReason('')
  }

  function getCountdown(dateStr: string, timeStr: string): string | null {
    try {
      const dt = parseISO(`${dateStr}T${timeStr}`)
      if (dt > new Date()) return formatDistanceToNow(dt, { addSuffix: true })
      return null
    } catch { return null }
  }

  function isCompleted(dateStr: string, timeStr: string, duration: number): boolean {
    try {
      const dt = parseISO(`${dateStr}T${timeStr}`)
      dt.setMinutes(dt.getMinutes() + duration)
      return dt < new Date()
    } catch { return false }
  }

  const displayList = activeTab === 'upcoming' ? activeBookings : cancelledBookings

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Enter your email to view your booked sessions.</p>
        </div>

        {/* Email lookup */}
        <form onSubmit={handleLookup} className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 animate-fade-in-up shadow-sm" style={{ animationDelay: '40ms' }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={!email.trim()}
              className="bg-gray-900 text-white px-5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Find bookings
            </button>
          </div>
        </form>

        {/* No bookings */}
        {submittedEmail && bookings.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center animate-fade-in">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <h2 className="text-base font-semibold text-gray-900">No bookings found</h2>
            <p className="mt-1.5 text-sm text-gray-500">No bookings for <span className="font-medium text-gray-900">{submittedEmail}</span>.</p>
            <Link
              to="/book"
              className="mt-6 inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Book a session <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Bookings found */}
        {bookings.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex items-center border-b border-gray-200 mb-6">
              {[
                { key: 'upcoming' as const, label: `Upcoming (${activeBookings.length})` },
                { key: 'cancelled' as const, label: `Cancelled (${cancelledBookings.length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {displayList.map((booking, i) => {
                const countdown = getCountdown(booking.date, booking.time)
                const isCancelled = booking.status === 'cancelled'
                const completed = booking.status === 'confirmed' && isCompleted(booking.date, booking.time, booking.duration)

                return (
                  <div key={booking.id} style={{ animationDelay: `${i * 40}ms` }}>
                  <div
                    className={`bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex items-center gap-5 hover:shadow-sm transition-shadow animate-fade-in-up ${isCancelled ? 'opacity-50' : ''}`}
                  >
                    {/* Date block */}
                    <div className="text-center shrink-0 w-12">
                      <div className={`text-[10px] font-bold uppercase ${isCancelled ? 'text-gray-400' : completed ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {format(parseISO(booking.date), 'EEE')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 leading-tight">
                        {format(parseISO(booking.date), 'dd')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {format(parseISO(booking.date), 'MMM')}
                      </div>
                    </div>

                    <div className="w-px h-10 bg-gray-100 shrink-0" />

                    {/* Time */}
                    <div className="shrink-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-semibold">{formatTime(booking.time)}</span>
                        <span className="text-gray-400">· {booking.duration}min</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        On-site
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {booking.presentationTopic}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {booking.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-xs text-amber-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            Awaiting confirmation
                          </span>
                        )}
                        {booking.status === 'confirmed' && !completed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-xs text-emerald-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Confirmed
                          </span>
                        )}
                        {completed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            Completed
                          </span>
                        )}
                        {countdown && booking.status === 'confirmed' && !completed && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                            <Timer className="w-3 h-3" />
                            {countdown}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cancel button */}
                    {!isCancelled && !completed && adminSettings.allowSelfCancel && cancelConfirmId !== booking.id && (
                      <button
                        onClick={() => openCancel(booking.id)}
                        className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Cancel booking"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Cancel reason panel */}
                  {cancelConfirmId === booking.id && !isCancelled && !completed && adminSettings.allowSelfCancel && (
                    <div className="mt-2 bg-red-50 border border-red-100 rounded-2xl p-4 animate-fade-in">
                      <p className="text-sm font-semibold text-red-700 mb-2">Cancel this booking?</p>
                      <textarea
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        rows={2}
                        maxLength={300}
                        placeholder="Reason for cancelling (optional)"
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl border border-red-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none transition"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                        >
                          Confirm cancellation
                        </button>
                        <button
                          onClick={() => { setCancelConfirmId(null); setCancelReason('') }}
                          className="px-4 py-2 rounded-xl border border-red-200 text-sm font-medium text-gray-600 hover:bg-red-100 transition-colors"
                        >
                          Keep booking
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )
              })}

              {displayList.length === 0 && (
                <div className="bg-white rounded-xl border border-[var(--border)] p-10 text-center text-sm text-[var(--text-muted)]">
                  No {activeTab} bookings.
                </div>
              )}
            </div>

            {/* Self-cancel disabled notice */}
            {!adminSettings.allowSelfCancel && activeBookings.length > 0 && (
              <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Cancellations are disabled. Contact your admin to cancel a booking.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
