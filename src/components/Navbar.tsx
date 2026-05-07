import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays, LayoutGrid, Clock, Settings as SettingsIcon,
  LogOut, Menu, X, BookOpen, Shield, Users, Zap, BarChart2,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBookings } from '../context/BookingContext'
import { format } from 'date-fns'

const studentLinks = [
  { to: '/book', label: 'Book a Slot', icon: CalendarDays },
  { to: '/my-bookings', label: 'My Bookings', icon: BookOpen },
]

const adminLinks = [
  { to: '/admin/dashboard', label: 'Bookings', icon: LayoutGrid },
  { to: '/admin/event-types', label: 'Event Types', icon: Zap },
  { to: '/admin/availability', label: 'Availability', icon: Clock },
  { to: '/admin/lecturers', label: 'Teams', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
]

const adminBottomLinks = [
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
]

const lecturerLinks = [
  { to: '/lecturer/dashboard', label: 'My Schedule', icon: LayoutGrid },
]

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
      {initials}
    </div>
  )
}

export default function Sidebar() {
  const { pathname } = useLocation()
  const { isAdmin, isSuperAdmin, isLecturer, currentLecturer, logout, user } = useAuth()
  const { bookings } = useBookings()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = isSuperAdmin
    ? [...adminLinks, { to: '/lecturer/dashboard', label: 'My Slots', icon: BookOpen }]
    : isAdmin ? adminLinks : isLecturer ? lecturerLinks : studentLinks

  const isActive = (to: string) => pathname === to || (to !== '/' && pathname.startsWith(to))

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const pendingCount = (isAdmin || isSuperAdmin)
    ? bookings.filter(b => b.status === 'pending' && b.date >= todayStr).length
    : 0

  const displayName = isAdmin
    ? (user?.email?.split('@')[0] ?? 'Admin')
    : isLecturer && currentLecturer
      ? currentLecturer.name
      : 'BookSlot'

  const displayEmail = isAdmin
    ? (user?.email ?? '')
    : isLecturer && currentLecturer
      ? currentLecturer.email
      : ''

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 mb-6">
        <Link
          to={isAdmin ? '/admin/dashboard' : isLecturer ? '/lecturer/dashboard' : '/'}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">BookSlot</span>
          {isSuperAdmin && (
            <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
              Super
            </span>
          )}
        </Link>
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {!isAdmin && !isLecturer && (
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`nav-item ${pathname === '/' ? 'active' : ''}`}
          >
            <LayoutGrid style={{ width: 16, height: 16 }} />
            Home
          </Link>
        )}

        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`nav-item ${isActive(to) ? 'active' : ''}`}
          >
            <Icon style={{ width: 16, height: 16 }} />
            <span className="flex-1">{label}</span>
            {label === 'Bookings' && pendingCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Admin bottom links */}
      {(isAdmin || isSuperAdmin) && (
        <div className="px-3 pt-2 border-t border-[var(--border)] mt-2">
          {adminBottomLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`nav-item ${isActive(to) ? 'active' : ''}`}
            >
              <Icon style={{ width: 16, height: 16 }} />
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* User section */}
      <div className="px-3 pt-3 pb-1 border-t border-[var(--border)] mt-2">
        {(isAdmin || isLecturer) ? (
          <div className="space-y-1">
            {/* User card */}
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
              <Avatar name={displayName} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                {displayEmail && (
                  <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { void logout(); setMobileOpen(false) }}
              className="nav-item text-gray-500 hover:text-red-600 w-full"
            >
              <LogOut style={{ width: 16, height: 16 }} />
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className="nav-item text-gray-400"
          >
            <Shield style={{ width: 16, height: 16 }} />
            Staff login
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[var(--border)] shadow-sm text-gray-500"
      >
        <Menu style={{ width: 18, height: 18 }} />
      </button>

      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="mobile-overlay md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar md:hidden flex ${mobileOpen ? 'open' : ''}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
