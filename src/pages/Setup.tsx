import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, User, AtSign, Briefcase, FileText, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '../hooks'

function slugify(v: string) {
  return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function Setup() {
  const { createProfile, user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameManual, setUsernameManual] = useState(false)
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleNameChange(v: string) {
    setName(v)
    if (!usernameManual) setUsername(slugify(v))
  }

  function handleUsernameChange(v: string) {
    setUsernameManual(true)
    setUsername(slugify(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Full name is required.'); return }
    if (!username.trim()) { setError('Username is required.'); return }
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(username)) {
      setError('Username must be 3–32 characters: lowercase letters, numbers, hyphens (no leading/trailing hyphens).')
      return
    }

    setLoading(true)
    try {
      await createProfile({ name: name.trim(), username, title: title.trim(), description: bio.trim() })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
          <CalendarDays className="text-white" style={{ width: 18, height: 18 }} />
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">BookSlot</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Set up your profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full name *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 15, height: 15 }} />
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Dr. Jane Smith"
                maxLength={80}
                required
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Username *</label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 15, height: 15 }} />
              <input
                type="text"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                placeholder="jane-smith"
                maxLength={32}
                required
                className={`${inputCls} pl-10`}
              />
            </div>
            {username && (
              <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                <Check style={{ width: 12, height: 12 }} className="text-emerald-500" />
                Your booking page: <span className="font-medium text-gray-600">{origin}/{username}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Title <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 15, height: 15 }} />
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Professor, Consultant, Designer…"
                maxLength={80}
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Bio <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 text-gray-400" style={{ width: 15, height: 15 }} />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="A short description shown on your booking page…"
                className={`${inputCls} pl-10 resize-none`}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Creating profile…' : 'Continue to dashboard →'}
          </button>
        </form>
      </div>
    </div>
  )
}
