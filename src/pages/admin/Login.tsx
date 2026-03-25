import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const { isAdmin, login } = useAuth()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)

  if (isAdmin) {
    navigate('/admin/dashboard', { replace: true })
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (login(pin)) {
      navigate('/admin/dashboard', { replace: true })
    } else {
      setError('Incorrect PIN. Please try again.')
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-light)] mb-4">
            <CalendarDays className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Admin Login</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Enter your PIN to manage presentation slots.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Admin PIN</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={!pin.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sign In <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          Default PIN: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[var(--text-secondary)]">admin123</code>
        </p>
      </div>
    </div>
  )
}
