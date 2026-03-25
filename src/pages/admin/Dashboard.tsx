import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Clock, Search, AlertCircle, Download, Filter, X, MapPin } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { formatTime } from '../../components/TimeSlots'

type TabFilter = 'upcoming' | 'confirmed' | 'cancelled'

export default function Dashboard() {
  const { bookings, slots, cancelBooking, exportBookingsCSV } = useBookings()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TabFilter>('upcoming')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const totalSlots = slots.length
  const bookedCount = confirmedBookings.length
  const availableCount = totalSlots - bookedCount

  const filtered = useMemo(() => {
    let list = bookings
    switch (filter) {
      case 'upcoming': {
        const today = format(new Date(), 'yyyy-MM-dd')
        list = list.filter((b) => b.status === 'confirmed' && b.date >= today)
        break
      }
      case 'confirmed':
      case 'cancelled':
        list = list.filter((b) => b.status === filter)
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
  }, [bookings, filter, search, dateFrom, dateTo])

  // Group by month
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {}
    for (const booking of filtered) {
      const monthKey = format(parseISO(booking.date), 'MMMM yyyy')
      if (!groups[monthKey]) groups[monthKey] = []
      groups[monthKey].push(booking)
    }
    return groups
  }, [filtered])

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'confirmed', label: 'All Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bookings</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">See your scheduled events from student bookings.</p>
            </div>
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

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8 stagger-children">
          {[
            { label: 'Total Slots', value: totalSlots, color: 'text-[var(--text-primary)]' },
            { label: 'Booked', value: bookedCount, color: 'text-[var(--accent)]' },
            { label: 'Available', value: availableCount, color: 'text-emerald-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[var(--border)] p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-[var(--border)] mb-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {tabs.map(tab => (
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

        {/* Search & Date Filter */}
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
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-[var(--accent)] hover:underline font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bookings List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
            <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">
              {bookings.length === 0 ? 'No bookings yet. Students will appear here once they book.' : 'No bookings match your filters.'}
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
                      className={`bg-white rounded-xl border border-[var(--border)] p-4 sm:p-5 flex items-center gap-5 hover:shadow-sm transition-shadow animate-fade-in-up ${
                        booking.status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                      style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
                    >
                      {/* Date Block */}
                      <div className="text-center shrink-0 w-14">
                        <div className={`text-xs font-semibold uppercase ${
                          booking.status === 'confirmed' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                        }`}>
                          {format(parseISO(booking.date), 'EEE')}
                        </div>
                        <div className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
                          {format(parseISO(booking.date), 'dd')}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-10 bg-[var(--border)]" />

                      {/* Time & Location */}
                      <div className="shrink-0 space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                          <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="font-medium">{formatTime(booking.time)}</span>
                          <span className="text-[var(--text-muted)]">· {booking.duration}min</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <MapPin className="w-3 h-3" />
                          Presentation
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{booking.presentationTopic}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{booking.studentName} · {booking.studentEmail}</p>
                      </div>

                      {/* Status / Action */}
                      {booking.status === 'confirmed' ? (
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Cancel booking"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-red-400 bg-red-50 px-2.5 py-1 rounded-md">
                          Cancelled
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
