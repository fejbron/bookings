import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { isAdmin, isLecturer, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    if (isAdmin) navigate('/admin/dashboard', { replace: true })
    else if (isLecturer) navigate('/lecturer/dashboard', { replace: true })
  }, [isAdmin, isLecturer, loading, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const err = await login(email, password)
    if (err) {
      setError('Invalid email or password.')
      setPassword('')
    }
    setSubmitting(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays style={{ width: 22, height: 22 }} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your BookSlot account.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {showPassword
                  ? <EyeOff style={{ width: 16, height: 16 }} />
                  : <Eye style={{ width: 16, height: 16 }} />
                }
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password || submitting}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRight style={{ width: 16, height: 16 }} />}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5">
          Students —{' '}
          <a href="/" className="text-gray-600 font-medium hover:text-gray-900 transition-colors">
            book a session instead
          </a>
        </p>
      </div>
    </div>
  )
}
