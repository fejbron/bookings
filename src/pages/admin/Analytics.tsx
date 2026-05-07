import { useMemo } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { BarChart2, TrendingUp, Users, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'

const COLOR_BG: Record<string, string> = {
  blue: '#006BFF', purple: '#7C3AED', green: '#059669',
  orange: '#EA580C', pink: '#DB2777', teal: '#0891B2', grey: '#4B5563',
}

function StatCard({
  icon: Icon, label, value, sub, color = 'gray',
}: {
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    gray: { bg: '#F3F4F6', text: '#111827', icon: '#6B7280' },
    green: { bg: '#F0FDF4', text: '#15803D', icon: '#16A34A' },
    amber: { bg: '#FFFBEB', text: '#B45309', icon: '#D97706' },
    blue: { bg: '#EBF3FF', text: '#1D4ED8', icon: '#006BFF' },
    red: { bg: '#FEF2F2', text: '#B91C1C', icon: '#DC2626' },
  }
  const c = colorMap[color] ?? colorMap.gray
  return (
    <div className="stat-card">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: c.bg }}
      >
        <Icon style={{ width: 18, height: 18, color: c.icon }} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Analytics() {
  const { bookings, slots, calendarTypeRecords } = useBookings()

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed')
    const pending = bookings.filter(b => b.status === 'pending')
    const cancelled = bookings.filter(b => b.status === 'cancelled')
    const todayConfirmed = confirmed.filter(b => b.date === today)
    const weekConfirmed = confirmed.filter(b => b.date >= weekStart && b.date <= weekEnd)
    const upcoming = confirmed.filter(b => b.date >= today)

    return {
      total: bookings.length,
      confirmed: confirmed.length,
      pending: pending.length,
      cancelled: cancelled.length,
      today: todayConfirmed.length,
      thisWeek: weekConfirmed.length,
      upcoming: upcoming.length,
      available: slots.length - (confirmed.length + pending.length),
    }
  }, [bookings, slots, today, weekStart, weekEnd])

  // Bookings per event type
  const byType = useMemo(() => {
    return calendarTypeRecords.map(rec => {
      const typeBookings = bookings.filter(b => {
        const slot = slots.find(s => s.id === b.slotId)
        return slot?.calendarType === rec.name
      })
      return {
        name: rec.name,
        color: rec.color,
        total: typeBookings.length,
        confirmed: typeBookings.filter(b => b.status === 'confirmed').length,
        pending: typeBookings.filter(b => b.status === 'pending').length,
        cancelled: typeBookings.filter(b => b.status === 'cancelled').length,
      }
    }).sort((a, b) => b.total - a.total)
  }, [calendarTypeRecords, bookings, slots])

  // Last 7 days activity
  const last7Days = useMemo(() => {
    const days = eachDayOfInterval({
      start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      end: new Date(),
    })
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const count = bookings.filter(b => b.createdAt?.startsWith(dayStr)).length
      return { day, label: format(day, 'EEE'), count }
    })
  }, [bookings])

  const maxDayCount = Math.max(...last7Days.map(d => d.count), 1)

  // Recent bookings
  const recentBookings = useMemo(() =>
    [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [bookings]
  )

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-gray-500">Overview of your booking activity.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          <StatCard icon={Users} label="Total bookings" value={stats.total} color="gray" />
          <StatCard icon={CheckCircle} label="Confirmed" value={stats.confirmed} sub="all time" color="green" />
          <StatCard icon={Clock} label="Pending review" value={stats.pending} color="amber" />
          <StatCard icon={Calendar} label="Today's bookings" value={stats.today} color="blue" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          <StatCard icon={TrendingUp} label="This week" value={stats.thisWeek} color="blue" />
          <StatCard icon={Calendar} label="Upcoming" value={stats.upcoming} color="green" />
          <StatCard icon={XCircle} label="Cancelled" value={stats.cancelled} color="red" />
          <StatCard icon={BarChart2} label="Available slots" value={stats.available} color="gray" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* 7-day chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Bookings — Last 7 days</h2>
            <div className="flex items-end gap-2 h-28">
              {last7Days.map(({ day, label, count }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500">
                    {count > 0 ? count : ''}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${Math.max((count / maxDayCount) * 80, count > 0 ? 8 : 2)}px`,
                      background: isToday(day) ? '#111827' : '#E5E7EB',
                    }}
                  />
                  <span className={`text-[10px] font-medium ${isToday(day) ? 'text-gray-900' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By event type */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">By event type</h2>
            {byType.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byType.map(t => {
                  const pct = stats.total > 0 ? Math.round((t.total / stats.total) * 100) : 0
                  return (
                    <div key={t.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: COLOR_BG[t.color] ?? '#4B5563' }}
                          />
                          <span className="text-sm font-medium text-gray-800">{t.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">{t.total} bookings</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: COLOR_BG[t.color] ?? '#4B5563' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent bookings */}
        {recentBookings.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Recent bookings</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {b.studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.studentName}</p>
                    <p className="text-xs text-gray-500 truncate">{b.presentationTopic}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700">{format(parseISO(b.date), 'MMM d')}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      b.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
