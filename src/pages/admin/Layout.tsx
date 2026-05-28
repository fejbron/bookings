import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Shield, Gauge, Users as UsersIcon, CalendarDays, Clock, BookOpen,
  Users2, Settings as SettingsIcon, FileClock, LogOut, Menu, X, ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../../hooks'

const ADMIN_NAV = [
  { to: '/admin',             label: 'Overview',      icon: Gauge,          exact: true },
  { to: '/admin/users',       label: 'Users',         icon: UsersIcon },
  { to: '/admin/bookings',    label: 'Bookings',      icon: CalendarDays },
  { to: '/admin/slots',       label: 'Slots',         icon: Clock },
  { to: '/admin/event-types', label: 'Session Types', icon: BookOpen },
  { to: '/admin/teams',       label: 'Teams',         icon: Users2 },
  { to: '/admin/settings',    label: 'Platform',      icon: SettingsIcon },
  { to: '/admin/audit',       label: 'Audit Log',     icon: FileClock },
]

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(to: string, exact?: boolean) {
    return exact ? pathname === to : pathname.startsWith(to)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initials = profile?.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 mb-5">
        <Link to="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield style={{ width: 18, height: 18 }} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900 tracking-tight leading-none">BookSlot</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500 mt-0.5">Admin</p>
          </div>
        </Link>
      </div>

      <div className="mx-3 mb-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft style={{ width: 12, height: 12 }} />
          Back to dashboard
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {ADMIN_NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={`nav-item ${isActive(to, exact) ? 'active' : ''}`}
          >
            <Icon style={{ width: 16, height: 16 }} />
            <span className="flex-1">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-3 pt-3 pb-1 border-t border-[var(--border)] mt-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.name ?? 'Admin'}</p>
            <p className="text-xs text-indigo-500 truncate font-medium">Superadmin</p>
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
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-[var(--border)] shadow-sm text-gray-500"
      >
        <Menu style={{ width: 18, height: 18 }} />
      </button>

      <aside className="sidebar hidden md:flex">{sidebarContent}</aside>

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
