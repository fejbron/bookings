import { Link } from 'react-router-dom'
import { Clock, ArrowRight, CalendarDays, Globe } from 'lucide-react'
import { useBookings } from '../context/BookingContext'
import { format, parseISO } from 'date-fns'

const COLOR_BG: Record<string, string> = {
  blue: '#006BFF', purple: '#7C3AED', green: '#059669',
  orange: '#EA580C', pink: '#DB2777', teal: '#0891B2', grey: '#4B5563',
}

const COLOR_LIGHT: Record<string, string> = {
  blue: '#EBF3FF', purple: '#EDE9FE', green: '#D1FAE5',
  orange: '#FED7AA', pink: '#FCE7F3', teal: '#CFFAFE', grey: '#F3F4F6',
}

function EventTypeCard({ name, color, count, description }: { name: string; color: string; count: number; description?: string }) {
  const bg = COLOR_BG[color] ?? '#4B5563'
  const light = COLOR_LIGHT[color] ?? '#F3F4F6'

  return (
    <Link
      to={`/book?type=${encodeURIComponent(name)}`}
      className="group block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <div
            className="w-2 h-2 rounded-full mb-3"
            style={{ background: bg }}
          />
          <h3 className="text-[15px] font-semibold text-gray-900">{name}</h3>
          {description && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
            <Clock style={{ width: 13, height: 13 }} />
            <span>{count > 0 ? `${count} slot${count !== 1 ? 's' : ''} available` : 'No slots yet'}</span>
          </div>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
          style={{ background: light }}
        >
          <ArrowRight style={{ width: 16, height: 16, color: bg }} />
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const { slots, bookings, getAvailableDates, getAvailableSlots, adminSettings, calendarTypeRecords } = useBookings()

  const totalAvailable = slots.length - bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length
  const upcomingDates = getAvailableDates().slice(0, 5)

  function getSlotCount(typeName: string) {
    return getAvailableDates(typeName).reduce((acc, date) => {
      return acc + getAvailableSlots(date, typeName).length
    }, 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile section */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-14 text-center">

          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gray-900 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-sm">
            BS
          </div>

          <h1 className="text-2xl font-bold text-gray-900">BookSlot</h1>

          {adminSettings.welcomeMessage ? (
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              {adminSettings.welcomeMessage}
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              Book a presentation slot directly. Pick a time that works for you.
            </p>
          )}

          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Globe style={{ width: 11, height: 11 }} />
              Africa/Accra
            </span>
            {totalAvailable > 0 && (
              <span className="flex items-center gap-1">
                <CalendarDays style={{ width: 11, height: 11 }} />
                {totalAvailable} slot{totalAvailable !== 1 ? 's' : ''} available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Event types */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Available sessions
        </p>

        {calendarTypeRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <CalendarDays style={{ width: 32, height: 32 }} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No booking types available yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {calendarTypeRecords.map(record => (
              <EventTypeCard
                key={record.id}
                name={record.name}
                color={record.color}
                count={getSlotCount(record.name)}
                description={record.description}
              />
            ))}
          </div>
        )}

        {/* Upcoming available dates */}
        {upcomingDates.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Upcoming availability
            </p>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
              {upcomingDates.map(date => {
                const available = getAvailableSlots(date)
                return (
                  <Link
                    key={date}
                    to="/book"
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="text-center w-10 flex-shrink-0">
                      <div className="text-[10px] font-bold uppercase text-gray-400">
                        {format(parseISO(date), 'EEE')}
                      </div>
                      <div className="text-lg font-bold text-gray-900 leading-tight">
                        {format(parseISO(date), 'd')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {format(parseISO(date), 'MMM')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600">
                        {available.length} slot{available.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <ArrowRight
                      style={{ width: 15, height: 15 }}
                      className="text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0"
                    />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* My bookings link */}
        <div className="mt-6 text-center">
          <Link
            to="/my-bookings"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Already booked? View my bookings →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-4">
        <p>Powered by <span className="font-semibold text-gray-600">BookSlot</span></p>
      </footer>
    </div>
  )
}
