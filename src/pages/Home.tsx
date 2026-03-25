import { Link } from 'react-router-dom'
import { CalendarCheck, Clock, ArrowRight, Presentation, MessageSquare, CalendarDays, User, Users } from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import { format, parseISO } from 'date-fns'

const steps = [
  { icon: CalendarCheck, title: 'Pick a Date', desc: 'Browse the calendar for available presentation dates.' },
  { icon: Clock, title: 'Choose a Time', desc: 'Select from the time slots your instructor has made available.' },
  { icon: Presentation, title: 'Confirm Booking', desc: 'Enter your details and secure your presentation slot.' },
]

export default function Home() {
  const { slots, bookings, getAvailableDates, getAvailableSlots, adminSettings } = useBookings()
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const availableCount = slots.length - confirmedCount
  const upcomingDates = getAvailableDates().slice(0, 5)

  const dateInfo = upcomingDates.map(date => {
    const available = getAvailableSlots(date)
    const lecturers = [...new Set(available.map(s => s.lecturerName).filter(Boolean))] as string[]
    const groups = [...new Set(available.map(s => s.classGroup).filter(Boolean))] as string[]
    return { date, count: available.length, lecturers, groups }
  })

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-16 sm:py-20">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 text-[var(--accent)] text-sm font-medium mb-4">
              <Presentation className="w-4 h-4" />
              Student Presentation Booking
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
              Book Your<br />
              <span className="text-[var(--accent)]">Presentation Slot</span>
            </h1>
            <p className="mt-4 text-base text-[var(--text-secondary)] max-w-lg">
              Reserve your presentation time in seconds. Pick an available date, choose your slot, and confirm.
            </p>

            {availableCount > 0 && (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-primary)]">{availableCount}</span> slot{availableCount !== 1 ? 's' : ''} currently available
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Book a Slot
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/my-bookings"
                className="inline-flex items-center gap-2 text-[var(--text-secondary)] border border-[var(--border)] px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Find My Bookings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Welcome Message */}
      {adminSettings.welcomeMessage && (
        <section className="max-w-4xl mx-auto px-6 sm:px-8 pt-6 animate-fade-in-up">
          <div className="bg-[var(--accent-light)] rounded-xl p-4 flex items-start gap-3 border border-orange-100">
            <MessageSquare className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-primary)] font-medium">{adminSettings.welcomeMessage}</p>
          </div>
        </section>
      )}

      {/* Upcoming Available Dates */}
      {upcomingDates.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 sm:px-8 pt-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="bg-white rounded-xl border border-[var(--border)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
              Next Available Dates
            </h3>
            <div className="space-y-2">
              {dateInfo.map(({ date, count, lecturers, groups }) => (
                <Link
                  key={date}
                  to="/book"
                  className="flex items-center gap-4 px-4 py-3 rounded-lg bg-gray-50 hover:bg-[var(--accent-light)] hover:border-orange-200 transition-colors border border-[var(--border)] group"
                >
                  <div className="shrink-0 text-center w-10">
                    <div className="text-[10px] font-bold uppercase text-[var(--accent)]">{format(parseISO(date), 'EEE')}</div>
                    <div className="text-xl font-bold text-[var(--text-primary)] leading-tight">{format(parseISO(date), 'd')}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{format(parseISO(date), 'MMM')}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      {lecturers.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <User className="w-3 h-3 text-[var(--text-muted)]" />
                          {lecturers.join(', ')}
                        </span>
                      )}
                      {groups.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <Users className="w-3 h-3 text-[var(--text-muted)]" />
                          {groups.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{count} slot{count !== 1 ? 's' : ''} available</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 sm:px-8 py-16">
        <div className="mb-10 animate-fade-in-up">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">How It Works</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Three simple steps to reserve your presentation time.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 stagger-children">
          {steps.map((step, i) => (
            <div key={i} className="bg-white rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center mb-4">
                <step.icon className="w-5 h-5" />
              </div>
              <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mb-1.5">
                Step {i + 1}
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] text-[var(--text-muted)] text-xs text-center py-6 px-4">
        <p>&copy; {new Date().getFullYear()} BookSlot &middot; Presentation Scheduling</p>
      </footer>
    </div>
  )
}
