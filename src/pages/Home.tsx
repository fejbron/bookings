import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Search, LogIn, GraduationCap } from 'lucide-react'
import { getDirectoryListing } from '../lib/db/queries'
import { ErrorState } from '../components/ui/States'
import type { Profile } from '../types'

function Avatar({ name, size = 12 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['bg-gray-900', 'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-teal-600']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} text-white flex items-center justify-center font-bold flex-shrink-0`} style={{ width: size * 4, height: size * 4, fontSize: size * 1.4 }}>
      {initials}
    </div>
  )
}

type PublicProfile = Profile & { slotCount?: number }

export default function Home() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const listing = await getDirectoryListing(today)
        if (!mounted) return
        setProfiles(listing.map(({ profile, slotCount }) => ({ ...profile, slotCount })))
        setError(null)
      } catch (err) {
        if (mounted) setError(err as Error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = profiles.filter(p =>
    !search.trim() ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <CalendarDays className="text-white" style={{ width: 15, height: 15 }} />
            </div>
            <span className="text-sm font-bold text-gray-900">BookSlot</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/my-bookings"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              My bookings
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 px-3.5 py-1.5 rounded-lg transition-colors"
            >
              <LogIn style={{ width: 14, height: 14 }} />
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Book time with professionals</h1>
          <p className="mt-3 text-base text-gray-500 max-w-md mx-auto">
            Find a professional, choose a time that works, and book instantly.
          </p>

          {/* Search */}
          <div className="relative max-w-sm mx-auto mt-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 16, height: 16 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or specialty…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Directory */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {error ? (
          <ErrorState error={error} retry={() => window.location.reload()} />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded w-full mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h2 className="text-base font-semibold text-gray-900">
              {search ? 'No results found' : 'No profiles yet'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {search ? 'Try a different search term.' : 'Be the first — create your booking page.'}
            </p>
            {!search && (
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">
              {filtered.length} professional{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(profile => (
                <Link
                  key={profile.id}
                  to={`/${profile.username}`}
                  className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={profile.name} size={12} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[15px] font-semibold text-gray-900 truncate">{profile.name}</p>
                        {profile.accountType === 'lecturer' && (
                          <span title="Lecturer" className="inline-flex items-center justify-center w-4 h-4 rounded text-blue-600 bg-blue-50 border border-blue-100 shrink-0">
                            <GraduationCap style={{ width: 10, height: 10 }} />
                          </span>
                        )}
                      </div>
                      {profile.title && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{profile.title}</p>
                      )}
                    </div>
                  </div>

                  {profile.description && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3 flex-1">
                      {profile.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-auto pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock style={{ width: 12, height: 12 }} />
                      {(profile.slotCount ?? 0) > 0
                        ? `${profile.slotCount} slot${profile.slotCount !== 1 ? 's' : ''} available`
                        : 'No slots yet'}
                    </div>
                    <span className="ml-auto text-xs text-gray-400 font-mono">@{profile.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-4">
        <p>Powered by <span className="font-semibold text-gray-600">BookSlot</span></p>
      </footer>
    </div>
  )
}
