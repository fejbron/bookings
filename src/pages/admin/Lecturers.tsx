import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Users, Plus, Trash2, Eye, EyeOff, AlertCircle, Check, X, User, Mail, Key, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Lecturers() {
  const { lecturers, loadLecturers, createLecturerAccount, deleteLecturerAccount } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [classGroup, setClassGroup] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => { loadLecturers() }, [loadLecturers])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required.'
    if (!email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email.'
    if (!password) errs.password = 'Password is required.'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await createLecturerAccount(name, email, password, classGroup)
      setName(''); setEmail(''); setPassword(''); setClassGroup('')
      setShowForm(false)
      setSuccessMsg('Lecturer account created successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteLecturerAccount(id)
    setDeleteConfirmId(null)
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                <Users className="w-6 h-6 text-[var(--accent)]" />
                Lecturers
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage lecturer accounts. Lecturers can view and manage bookings for their own slots.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" /> Add Lecturer
              </button>
            )}
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 animate-fade-in">
            <Check className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        {/* Add Lecturer Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 mb-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">New Lecturer Account</h2>
              <button type="button" onClick={() => { setShowForm(false); setErrors({}); setSubmitError('') }} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                  placeholder="Dr. Jane Smith"
                  maxLength={100}
                  className={`${inputCls} ${errors.name ? 'border-red-300' : 'border-[var(--border)]'}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })) }}
                  placeholder="lecturer@university.edu"
                  maxLength={254}
                  className={`${inputCls} ${errors.email ? 'border-red-300' : 'border-[var(--border)]'}`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <Key className="w-3 h-3" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                    placeholder="Min. 6 characters"
                    className={`${inputCls} pr-10 ${errors.password ? 'border-red-300' : 'border-[var(--border)]'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Class Group */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Class Group <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={classGroup}
                  onChange={e => setClassGroup(e.target.value)}
                  placeholder="e.g. CS Year 3"
                  maxLength={100}
                  className={`${inputCls} border-[var(--border)]`}
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" /> {submitError}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setErrors({}); setSubmitError('') }}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {submitting ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        {/* Lecturers List */}
        {lecturers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No lecturer accounts yet. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lecturers.map((lecturer, i) => (
              <div
                key={lecturer.id}
                className="bg-white rounded-xl border border-[var(--border)] p-4 sm:p-5 flex items-center gap-4 animate-fade-in-up hover:shadow-sm transition-shadow"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[var(--accent)]">
                    {lecturer.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{lecturer.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{lecturer.email}</p>
                  {lecturer.classGroup && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-[var(--text-secondary)] font-medium">{lecturer.classGroup}</span>
                  )}
                </div>

                {/* Date */}
                <p className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">
                  Added {format(parseISO(lecturer.createdAt), 'MMM d, yyyy')}
                </p>

                {/* Delete */}
                {deleteConfirmId === lecturer.id ? (
                  <div className="flex items-center gap-2 shrink-0 animate-scale-in">
                    <span className="text-xs text-red-500 font-medium">Remove?</span>
                    <button onClick={() => handleDelete(lecturer.id)} className="px-2 py-0.5 rounded text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Yes</button>
                    <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-0.5 rounded text-xs font-medium text-[var(--text-secondary)] hover:bg-gray-100 transition-colors">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(lecturer.id)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Remove lecturer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 text-xs text-[var(--text-muted)] bg-gray-50 rounded-lg p-3 border border-[var(--border)]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Lecturers see bookings for slots where their name matches the <strong>Lecturer Name</strong> set on the slot.
            Make sure the name entered here matches exactly what is used when generating slots on the Availability page.
          </span>
        </div>
      </div>
    </div>
  )
}
