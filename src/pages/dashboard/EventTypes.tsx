import { useState } from 'react'
import { Plus, Trash2, Check, Clock, GraduationCap } from 'lucide-react'
import { useEventTypes, useAuth } from '../../hooks'
import type { CalendarTypeRecord } from '../../types'

const COLOR_OPTIONS = [
  { key: 'blue', label: 'Blue', bg: '#006BFF', light: '#EBF3FF' },
  { key: 'purple', label: 'Purple', bg: '#7C3AED', light: '#EDE9FE' },
  { key: 'green', label: 'Green', bg: '#059669', light: '#D1FAE5' },
  { key: 'orange', label: 'Orange', bg: '#EA580C', light: '#FED7AA' },
  { key: 'pink', label: 'Pink', bg: '#DB2777', light: '#FCE7F3' },
  { key: 'teal', label: 'Teal', bg: '#0891B2', light: '#CFFAFE' },
  { key: 'grey', label: 'Gray', bg: '#4B5563', light: '#F3F4F6' },
]

const COLOR_BG: Record<string, string> = Object.fromEntries(COLOR_OPTIONS.map(c => [c.key, c.bg]))
const COLOR_LIGHT: Record<string, string> = Object.fromEntries(COLOR_OPTIONS.map(c => [c.key, c.light]))

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
      {copied ? <Check style={{ width: 13, height: 13 }} className="text-green-600" /> : <Plus style={{ width: 13, height: 13 }} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

function TypeCard({ type, onDelete, bookingUrl }: { type: CalendarTypeRecord; onDelete: () => void; bookingUrl: string }) {
  const [showDelete, setShowDelete] = useState(false)
  const bg = COLOR_BG[type.color] ?? '#4B5563'
  const light = COLOR_LIGHT[type.color] ?? '#F3F4F6'

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: light }}>
            <Clock style={{ width: 16, height: 16, color: bg }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{type.name}</h3>
              {type.isPresentation && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                  <GraduationCap style={{ width: 10, height: 10 }} /> Presentation
                </span>
              )}
            </div>
            {type.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{type.description}</p>
            )}
          </div>
        </div>
        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: bg }} />
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 -mt-1">
        <CopyLinkButton url={bookingUrl} />
        {showDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)]">Delete?</span>
            <button onClick={onDelete} className="text-red-500 font-semibold hover:text-red-600">Yes</button>
            <button onClick={() => setShowDelete(false)} className="text-[var(--text-muted)]">No</button>
          </div>
        ) : (
          <button onClick={() => setShowDelete(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function DashboardEventTypes() {
  const { types: calendarTypeRecords, create: addCalendarType, remove: deleteCalendarType } = useEventTypes()
  const { profile } = useAuth()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [newDesc, setNewDesc] = useState('')
  const [newIsPresentation, setNewIsPresentation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const baseUrl = profile?.username ? `${origin}/${profile.username}` : ''

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    if (calendarTypeRecords.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      setError('A type with this name already exists.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await addCalendarType({ name, color: newColor, description: newDesc.trim() || undefined, isPresentation: newIsPresentation })
      setNewName(''); setNewColor('blue'); setNewDesc(''); setNewIsPresentation(false); setShowNew(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition bg-white"

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Event Types</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Define what kinds of sessions people can book with you.</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Plus style={{ width: 15, height: 15 }} /> New type
          </button>
        </div>

        {/* Create form */}
        {showNew && (
          <div className="bg-white rounded-xl border border-[var(--border)] p-5 mb-6">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">New event type</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Name *</label>
                <input type="text" value={newName} onChange={e => { setNewName(e.target.value); setError('') }} placeholder="e.g. Office Hours, Consultation" maxLength={50} autoFocus className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} maxLength={200} placeholder="Describe this session type…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.key} type="button" onClick={() => setNewColor(c.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${newColor === c.key ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      style={newColor === c.key ? { background: c.bg, borderColor: c.bg } : {}}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.bg }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border border-[var(--border)] rounded-lg px-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Presentation type</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Booking form will collect a student roster with index numbers for scoring</p>
                </div>
                <label className="toggle cursor-pointer ml-4 shrink-0">
                  <input type="checkbox" checked={newIsPresentation} onChange={e => setNewIsPresentation(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={!newName.trim() || loading} className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? 'Creating…' : 'Create'}
                </button>
                <button onClick={() => { setShowNew(false); setError(''); setNewName(''); setNewDesc(''); setNewIsPresentation(false) }} className="px-5 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {calendarTypeRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">No event types yet</h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">Create your first event type to start accepting bookings.</p>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
              <Plus style={{ width: 15, height: 15 }} /> Create event type
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {calendarTypeRecords.map(type => (
              <TypeCard
                key={type.id}
                type={type}
                bookingUrl={`${baseUrl}?type=${encodeURIComponent(type.name)}`}
                onDelete={() => deleteCalendarType(type.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
