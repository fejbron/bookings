import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays, LayoutGrid, Clock, Settings, LogOut,
  Menu, X, ExternalLink, Copy, Check, BookOpen,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBookings } from '../../context/BookingContext'
import { format } from 'date-fns'

const NAV = [
  { to: '/dashboard', label: 'Bookings', icon: LayoutGrid, exact: true },
  { to: '/dashboard/slots', label: 'Availability', icon: Clock },
  { to: '/dashboard/event-types', label: 'Event Types', icon: BookOpen },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors" title="Copy link">
      {copied ? <Check style={{ width: 13, height: 13 }} className="text-emerald-400" /> : <Copy style={{ width: 13, height: 13 }} />}
    </button>
  )
}

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const { bookings } = useBookings()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const pendingCount = bookings.filter(b => b.status === 'pending' && b.date >= todayStr).length

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const bookingUrl = profile?.username ? `${origin}/${profile.username}` : ''

  function isActive(to: string, exact?: boolean) {
    return exact ? pathname === to : pathname.startsWith(to)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initials = profile?.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 mb-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <CalendarDays style={{ width: 18, height: 18 }} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">BookSlot</span>
        </Link>
      </div>

      {/* Booking link */}
      {bookingUrl && (
        <div className="mx-3 mb-4 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Your booking page</p>
          <div className="flex items-center gap-1.5">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-xs text-gray-700 font-medium truncate hover:text-gray-900 transition-colors"
            >
              /{profile?.username}
            </a>
            <CopyButton text={bookingUrl} />
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors">
              <ExternalLink style={{ width: 13, height: 13 }} />
            </a>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`nav-item ${isActive(to, exact) ? 'active' : ''}`}
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

      {/* User */}
      <div className="px-3 pt-3 pb-1 border-t border-[var(--border)] mt-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.name ?? 'Loading…'}</p>
            <p className="text-xs text-gray-500 truncate">{profile?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="nav-item text-gray-500 hover:text-red-600 w-full"
        >
          <LogOut style={{ width: 16, height: 16 }} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[var(--border)] shadow-sm text-gray-500"
      >
        <Menu style={{ width: 18, height: 18 }} />
      </button>

      {/* Desktop sidebar */}
      <aside className="sidebar hidden md:flex">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="mobile-overlay md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar md:hidden flex ${mobileOpen ? 'open' : ''}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <X style={{ width: 18, height: 18 }} />
        </button>
        {sidebarContent}
      </aside>

      <main className="main-content"><Outlet /></main>
    </div>
  )
}
