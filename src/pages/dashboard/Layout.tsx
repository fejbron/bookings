import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays, LayoutGrid, Clock, Settings, LogOut,
  Menu, X, ExternalLink, Copy, Check, BookOpen, ChevronDown, Users,
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

function AccountSwitcher() {
  const { user, profile, activeUserId, managedAccounts, switchAccount, isManagingOther } = useAuth()
  const [open, setOpen] = useState(false)

  if (managedAccounts.length === 0) return null

  const activeLabel = isManagingOther
    ? managedAccounts.find(a => a.hostUserId === activeUserId)?.profile.name ?? 'Unknown'
    : profile?.name ?? 'My account'

  return (
    <div className="mx-3 mb-3 relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Users style={{ width: 12, height: 12 }} className="shrink-0" />
          <span className="truncate">Managing: {activeLabel}</span>
        </div>
        <ChevronDown style={{ width: 12, height: 12 }} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Switch account</p>

            {/* Own account */}
            <button
              onClick={() => { switchAccount(user!.id); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!isManagingOther ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
            >
              <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {profile?.name.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium truncate">{profile?.name ?? 'My account'}</p>
                <p className="text-[10px] text-gray-400 truncate">My account</p>
              </div>
              {!isManagingOther && <Check style={{ width: 12, height: 12 }} className="text-blue-600 shrink-0" />}
            </button>

            {/* Managed accounts */}
            {managedAccounts.map(account => (
              <button
                key={account.hostUserId}
                onClick={() => { switchAccount(account.hostUserId); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${activeUserId === account.hostUserId ? 'text-gray-900 font-medium' : 'text-gray-600'}`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {account.profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium truncate">{account.profile.name}</p>
                  <p className="text-[10px] text-gray-400 truncate capitalize">{account.role}</p>
                </div>
                {activeUserId === account.hostUserId && <Check style={{ width: 12, height: 12 }} className="text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout() {
  const { profile, activeProfile, isManagingOther, signOut } = useAuth()
  const { bookings } = useBookings()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const pendingCount = bookings.filter(b => b.status === 'pending' && b.date >= todayStr).length

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const bookingUrl = activeProfile?.username ? `${origin}/${activeProfile.username}` : ''

  function isActive(to: string, exact?: boolean) {
    return exact ? pathname === to : pathname.startsWith(to)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const displayProfile = activeProfile ?? profile
  const initials = displayProfile?.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 mb-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <CalendarDays style={{ width: 18, height: 18 }} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">BookSlot</span>
        </Link>
      </div>

      {/* Account switcher (shows when user manages other accounts) */}
      <AccountSwitcher />

      {/* Booking link */}
      {bookingUrl && (
        <div className="mx-3 mb-4 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
            {isManagingOther ? 'Booking page' : 'Your booking page'}
          </p>
          <div className="flex items-center gap-1.5">
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-xs text-gray-700 font-medium truncate hover:text-gray-900 transition-colors"
            >
              /{activeProfile?.username}
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
          <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isManagingOther ? 'bg-blue-600' : 'bg-gray-900'}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayProfile?.name ?? 'Loading…'}</p>
            <p className="text-xs text-gray-500 truncate">
              {isManagingOther ? `via ${profile?.name ?? 'your account'}` : displayProfile?.email ?? ''}
            </p>
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
