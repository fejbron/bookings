import { Link } from 'react-router-dom'
import {
  CalendarDays,
  LogIn,
  UserSearch,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

const STEPS = [
  {
    icon: UserSearch,
    title: 'Connect',
    body: 'Open the booking link they shared with you (it looks like bookslot.app/their-handle).',
  },
  {
    icon: CalendarCheck,
    title: 'Pick a time that works',
    body: 'See live availability on their page and pick a slot that fits your schedule.',
  },
  {
    icon: CheckCircle2,
    title: 'Book instantly',
    body: 'Get a confirmation right away — no emails, no back-and-forth required.',
  },
] as const

export default function Home() {
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
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-14 text-center">
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
            Book a Session,
            <br className="hidden sm:block" />
            <span className="text-gray-500"> in seconds.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-500 max-w-xl mx-auto">
            Open the link shared with you, pick a time on their calendar,
            and get an instant confirmation. No emails. No back-and-forth.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/my-bookings"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors w-full sm:w-auto"
            >
              View my bookings
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-900 px-5 py-3 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              I'm a professional
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">How it works</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Three steps to your next meeting
            </h2>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              BookSlot keeps things simple.
            </p>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <li
                  key={step.title}
                  className="relative bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center">
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

      {/* Pro CTA */}
      <section className="max-w-5xl mx-auto px-6 py-12">
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
