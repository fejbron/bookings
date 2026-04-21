import { Link, useLocation } from 'react-router-dom'
import { CalendarCheck, LayoutGrid, Clock, Settings as SettingsIcon, LogOut, Menu, X, CalendarDays, BookOpen, Shield, Users } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useBookings } from '../context/BookingContext'
import { format } from 'date-fns'

const studentLinks = [
  { to: '/book', label: 'Bookings', icon: CalendarCheck },
  { to: '/my-bookings', label: 'My Bookings', icon: BookOpen },
]

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/admin/slots', label: 'Availability', icon: Clock },
  { to: '/admin/lecturers', label: 'Lecturers', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
]

const lecturerLinks = [
  { to: '/lecturer/dashboard', label: 'My Bookings', icon: LayoutGrid },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { isAdmin, isLecturer, currentLecturer, logout } = useAuth()
  const { bookings, getLecturerBookings } = useBookings()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = isAdmin ? adminLinks : isLecturer ? lecturerLinks : studentLinks
  const isActive = (to: string) => pathname === to || (to !== '/' && pathname.startsWith(to))

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayBookingCount = isLecturer && currentLecturer
    ? getLecturerBookings(currentLecturer.name).filter(b => b.status === 'confirmed' && b.date === todayStr).length
    : bookings.filter(b => b.status === 'confirmed' && b.date === todayStr).length

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link
        to={isAdmin ? '/admin/dashboard' : isLecturer ? '/lecturer/dashboard' : '/'}
        className="flex items-center gap-2.5 px-6 mb-8"
        onClick={() => setMobileOpen(false)}
      >
        <CalendarDays className="w-7 h-7 text-[var(--accent)]" />
        <span className="text-lg font-bold text-[var(--text-primary)]">BookSlot</span>
        {isAdmin && (
          <span className="text-[10px] font-semibold bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-md uppercase tracking-wider">
            Admin
          </span>
        )}
        {isLecturer && (
          <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
            Lecturer
          </span>
        )}
      </Link>

      {/* Nav Links */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {!isAdmin && (
            <li>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-gray-100 hover:text-[var(--text-primary)]'
                }`}
              >
                <LayoutGrid className="w-[18px] h-[18px]" />
                Home
              </Link>
            </li>
          )}
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:bg-gray-100 hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {label}
                {(label === 'Dashboard' || label === 'My Bookings') && todayBookingCount > 0 && (
                  <span className="ml-auto text-[10px] font-semibold bg-[var(--accent)] text-white w-5 h-5 rounded-full flex items-center justify-center">
                    {todayBookingCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-3 mt-auto pt-4 border-t border-[var(--border)]">
        {(isAdmin || isLecturer) ? (
          <div className="space-y-1">
            {isLecturer && currentLecturer && (
              <div className="px-4 py-2 text-xs text-[var(--text-muted)] truncate">
                {currentLecturer.name}
                {currentLecturer.classGroup && <span className="block text-[var(--text-muted)] opacity-70">{currentLecturer.classGroup}</span>}
              </div>
            )}
            <button
              onClick={() => { void logout(); setMobileOpen(false) }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-100 hover:text-red-600 transition-colors w-full"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-gray-100 hover:text-[var(--text-secondary)] transition-colors"
          >
            <Shield className="w-[18px] h-[18px]" />
            Staff Login
          </Link>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[var(--border)] shadow-sm text-[var(--text-secondary)]"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar + Overlay */}
      {mobileOpen && (
        <div className="mobile-overlay md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar md:hidden flex ${mobileOpen ? 'open' : ''}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
