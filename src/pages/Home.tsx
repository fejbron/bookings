import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  Search,
  LogIn,
  GraduationCap,
  UserSearch,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
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

const STEPS = [
  {
    icon: UserSearch,
    title: 'Find a professional',
    body: 'Search by name or specialty, or browse the directory below.',
  },
  {
    icon: CalendarCheck,
    title: 'Pick a time that works',
    body: 'Open their page to see live availability and choose a slot.',
  },
  {
    icon: CheckCircle2,
    title: 'Book instantly',
    body: 'Get a confirmation right away — no back-and-forth required.',
  },
] as const

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
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-gray-50 to-gray-50 border-b border-gray-100">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 50% 0%, rgba(99, 102, 241, 0.10) 0%, rgba(255,255,255,0) 60%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            <Sparkles style={{ width: 12, height: 12 }} />
            Book in three steps
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
            Book time with professionals,
            <br className="hidden sm:block" />
            <span className="text-gray-500"> in seconds.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-500 max-w-xl mx-auto">
            Find someone you want to meet, pick a time on their calendar, and get
            an instant confirmation. No emails. No back-and-forth.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 18, height: 18 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or specialty…"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white shadow-sm"
            />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Or scroll down to browse {profiles.length > 0 ? `${profiles.length} ` : ''}available
            {profiles.length === 1 ? ' professional' : ' professionals'}.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">How it works</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Three steps to your next meeting
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <li
                  key={step.title}
                  className="relative bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                      <Icon style={{ width: 18, height: 18 }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-300 tracking-widest">
                      STEP {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.body}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Directory */}
      <section id="directory" className="max-w-5xl mx-auto px-6 py-12">
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
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <CalendarDays className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-gray-900">
              {search ? 'No results found' : 'No profiles yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? 'Try a different search term.' : 'Be the first — create your booking page.'}
            </p>
            {!search && (
              <Link
                to="/login"
                className="mt-5 inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Get started
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(profile => {
              const slotCount = profile.slotCount ?? 0
              const hasSlots = slotCount > 0
              return (
                <Link
                  key={profile.id}
                  to={`/${profile.username}`}
                  className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-900 hover:shadow-md transition-all flex flex-col"
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

                  <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${hasSlots ? 'text-emerald-700' : 'text-gray-400'}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${hasSlots ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <Clock style={{ width: 12, height: 12 }} />
                      {hasSlots
                        ? `${slotCount} slot${slotCount !== 1 ? 's' : ''} available`
                        : 'No slots yet'}
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-gray-900 transition-colors">
                      Book
                      <ArrowRight style={{ width: 12, height: 12 }} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Pro CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">For professionals</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">Have your own booking page in minutes.</h3>
            <p className="mt-1 text-sm text-gray-500">Create event types, set your availability, and share a single link.</p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Get started
            <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100">
        <p>Powered by <span className="font-semibold text-gray-600">BookSlot</span></p>
      </footer>
    </div>
  )
}
