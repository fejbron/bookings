import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users as UsersIcon, CalendarDays, Clock, BookOpen, Users2, FileClock,
  Shield, AlertTriangle, TrendingUp, ArrowRight,
} from 'lucide-react'
import { getPlatformMetrics, type PlatformMetrics } from '../../lib/db/admin/queries'
import { ErrorState, LoadingState } from '../../components/ui/States'

type CardColor = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'gray'
const COLOR_BG: Record<CardColor, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  gray: 'bg-gray-50 text-gray-700 border-gray-100',
}

function MetricCard({
  label, value, sublabel, icon: Icon, color = 'gray', to,
}: {
  label: string
  value: number | string
  sublabel?: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  color?: CardColor
  to?: string
}) {
  const body = (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5 hover:border-gray-300 transition-colors h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${COLOR_BG[color]}`}>
          <Icon style={{ width: 18, height: 18 }} />
        </div>
        {to && <ArrowRight style={{ width: 14, height: 14 }} className="text-gray-300" />}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
    </div>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

export default function AdminOverview() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const m = await getPlatformMetrics()
        if (mounted) { setMetrics(m); setError(null) }
      } catch (err) {
        if (mounted) setError(err as Error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={() => window.location.reload()} /></div>
  if (!metrics) return null

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform overview</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">A bird's-eye view of users, bookings, and activity across the platform.</p>
      </div>

      {/* Users */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Users</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total users" value={metrics.totalUsers} icon={UsersIcon} color="indigo" to="/admin/users" />
          <MetricCard label="Lecturers" value={metrics.lecturers} icon={BookOpen} color="sky" />
          <MetricCard label="Professionals" value={metrics.professionals} icon={UsersIcon} color="violet" />
          <MetricCard label="Suspended" value={metrics.suspendedUsers} icon={AlertTriangle} color="amber" sublabel={metrics.suspendedUsers > 0 ? 'Need review' : 'All clear'} />
        </div>
      </div>

      {/* Bookings */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Bookings</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total" value={metrics.totalBookings} icon={CalendarDays} color="indigo" to="/admin/bookings" />
          <MetricCard label="Last 7 days" value={metrics.bookingsLast7Days} icon={TrendingUp} color="emerald" />
          <MetricCard label="Pending" value={metrics.bookingsPending} icon={Clock} color="amber" />
          <MetricCard label="Confirmed" value={metrics.bookingsConfirmed} icon={CalendarDays} color="emerald" />
        </div>
      </div>

      {/* Inventory */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Inventory</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total slots" value={metrics.totalSlots} icon={Clock} color="sky" to="/admin/slots" />
          <MetricCard label="Upcoming slots" value={metrics.slotsUpcoming} icon={Clock} color="emerald" />
          <MetricCard label="Session types" value={metrics.totalSessionTypes} icon={BookOpen} color="violet" to="/admin/event-types" />
          <MetricCard label="Team memberships" value={metrics.totalTeams} icon={Users2} color="gray" to="/admin/teams" />
        </div>
      </div>

      {/* Admin */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Administration</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Platform admins" value={metrics.platformAdmins} icon={Shield} color="indigo" to="/admin/users" />
          <MetricCard label="Audit log" value="View" icon={FileClock} color="gray" to="/admin/audit" />
        </div>
      </div>
    </div>
  )
}
