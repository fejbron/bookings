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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'cancelled'>('upcoming')

  const bookings = useMemo(
    () => (submittedEmail ? getStudentBookings(submittedEmail) : []),
    [submittedEmail, getStudentBookings],
  )
  const activeBookings = bookings.filter(b => b.status === 'confirmed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setSubmittedEmail(email.trim())
  }

  async function handleCancel(id: string) {
    await cancelBooking(id)
    setCancelConfirmId(null)
  }

  function getCountdown(dateStr: string, timeStr: string): string | null {
    try {
      const dt = parseISO(`${dateStr}T${timeStr}`)
      if (dt > new Date()) return formatDistanceToNow(dt, { addSuffix: true })
      return null
    } catch { return null }
  }

  const displayList = activeTab === 'upcoming' ? activeBookings : cancelledBookings

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Bookings</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Enter your student email to view your presentation slots.</p>
        </div>

        {/* Email lookup */}
        <form onSubmit={handleLookup} className="bg-white rounded-xl border border-[var(--border)] p-4 mb-6 animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@school.edu"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={!email.trim()}
              className="bg-[var(--accent)] text-white px-5 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
        </form>

        {/* No bookings */}
        {submittedEmail && bookings.length === 0 && (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-4" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">No bookings found</h2>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">No bookings match <span className="font-medium text-[var(--text-primary)]">{submittedEmail}</span>.</p>
            <Link
              to="/book"
              className="mt-6 inline-flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
            >
              Book a Slot <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Bookings found */}
        {bookings.length > 0 && (
          <>
            {/* Tabs */}
            <div className="flex items-center border-b border-[var(--border)] mb-6">
              {[
                { key: 'upcoming' as const, label: `Upcoming (${activeBookings.length})` },
                { key: 'cancelled' as const, label: `Cancelled (${cancelledBookings.length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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

                return (
                  <div
                    key={booking.id}
                    className={`bg-white rounded-xl border border-[var(--border)] p-4 sm:p-5 flex items-center gap-5 hover:shadow-sm transition-shadow animate-fade-in-up ${isCancelled ? 'opacity-60' : ''}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Date block */}
                    <div className="text-center shrink-0 w-12">
                      <div className={`text-xs font-semibold uppercase ${!isCancelled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                        {format(parseISO(booking.date), 'EEE')}
                      </div>
                      <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                        {format(parseISO(booking.date), 'dd')}
                      </div>
                    </div>

                    <div className="w-px h-10 bg-[var(--border)] shrink-0" />

                    {/* Time */}
                    <div className="shrink-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="font-medium">{formatTime(booking.time)}</span>
                        <span className="text-[var(--text-muted)]">· {booking.duration}min</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <MapPin className="w-3 h-3" />
                        Presentation
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCancelled ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                        {booking.presentationTopic}
                      </p>
                      {booking.bookingPurpose && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-[var(--text-secondary)] font-medium">{booking.bookingPurpose}</span>
                      )}
                      {countdown && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                          <Timer className="w-3 h-3" />
                          {countdown}
                        </div>
                      )}
                    </div>

                    {/* Cancel */}
                    {!isCancelled && adminSettings.allowSelfCancel && (
                      cancelConfirmId === booking.id ? (
                        <div className="shrink-0 flex flex-col items-end gap-1 animate-scale-in">
                          <span className="text-xs text-red-500 font-medium">Cancel?</span>
                          <div className="flex gap-1">
                            <button onClick={() => handleCancel(booking.id)} className="px-2 py-0.5 rounded text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Yes</button>
                            <button onClick={() => setCancelConfirmId(null)} className="px-2 py-0.5 rounded text-xs font-medium text-[var(--text-secondary)] hover:bg-gray-100 transition-colors">No</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancelConfirmId(booking.id)}
                          className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )
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
