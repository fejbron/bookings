import { useState, useEffect } from 'react'
import {
  Plus, Copy, Trash2, Check, ExternalLink, Zap,
  Clock, Link as LinkIcon, MoreHorizontal, Pencil, X,
} from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { useAuth } from '../../context/AuthContext'
import type { CalendarTypeRecord } from '../../types'

const COLOR_OPTIONS = [
  { key: 'blue',   label: 'Blue',   bg: '#006BFF', light: '#EBF3FF' },
  { key: 'purple', label: 'Purple', bg: '#7C3AED', light: '#EDE9FE' },
  { key: 'green',  label: 'Green',  bg: '#059669', light: '#D1FAE5' },
  { key: 'orange', label: 'Orange', bg: '#EA580C', light: '#FED7AA' },
  { key: 'pink',   label: 'Pink',   bg: '#DB2777', light: '#FCE7F3' },
  { key: 'teal',   label: 'Teal',   bg: '#0891B2', light: '#CFFAFE' },
  { key: 'grey',   label: 'Gray',   bg: '#4B5563', light: '#F3F4F6' },
]

const COLOR_BG: Record<string, string> = {
  blue: '#006BFF', purple: '#7C3AED', green: '#059669',
  orange: '#EA580C', pink: '#DB2777', teal: '#0891B2', grey: '#4B5563',
}

const COLOR_LIGHT: Record<string, string> = {
  blue: '#EBF3FF', purple: '#EDE9FE', green: '#D1FAE5',
  orange: '#FED7AA', pink: '#FCE7F3', teal: '#CFFAFE', grey: '#F3F4F6',
}

function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: COLOR_BG[color] ?? '#4B5563',
        flexShrink: 0,
      }}
    />
  )
}

function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      title="Copy booking link"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
    >
      {copied ? <Check style={{ width: 13, height: 13 }} className="text-green-600" /> : <Copy style={{ width: 13, height: 13 }} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

interface EditModalProps {
  record: CalendarTypeRecord | null
  onClose: () => void
  onSave: (name: string, color: string) => Promise<void>
}

function EditModal({ record, onClose, onSave }: EditModalProps) {
  const [name, setName] = useState(record?.name ?? '')
  const [color, setColor] = useState(record?.color ?? 'blue')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      await onSave(name.trim(), color)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            {record ? 'Edit Event Type' : 'New Event Type'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Presentation, Office Hours"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setColor(opt.key)}
                  title={opt.label}
                  className={`w-8 h-8 rounded-full transition-transform ${color === opt.key ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : 'hover:scale-105'}`}
                  style={{ background: opt.bg }}
                />
              ))}
            </div>
          </div>

          <div className="pt-1 p-3 rounded-xl" style={{ background: COLOR_LIGHT[color] ?? '#F3F4F6' }}>
            <div className="flex items-center gap-2.5">
              <ColorDot color={color} size={12} />
              <span className="text-sm font-medium text-gray-800">{name || 'Event type name'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-5.5">Preview of how it will appear</p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : record ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventTypes() {
  const { calendarTypeRecords, slots, bookings, addCalendarType, deleteCalendarType } = useBookings()
  const { loadLecturers } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CalendarTypeRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  useEffect(() => { loadLecturers() }, [loadLecturers])

  function getSlotStats(typeName: string) {
    const typeSlots = slots.filter(s => s.calendarType === typeName)
    const typeBookings = bookings.filter(b => {
      const slot = slots.find(s => s.id === b.slotId)
      return slot?.calendarType === typeName && (b.status === 'confirmed' || b.status === 'pending')
    })
    return { total: typeSlots.length, booked: typeBookings.length }
  }

  function getBookingUrl(typeName: string) {
    return `${window.location.origin}/book?type=${encodeURIComponent(typeName)}`
  }

  async function handleSave(name: string, color: string) {
    if (editTarget) {
      // For now, add as new (edit not yet in context — we just recreate)
      await addCalendarType(name, color)
    } else {
      await addCalendarType(name, color)
    }
  }

  async function handleDelete(id: string) {
    await deleteCalendarType(id)
    setDeleteId(null)
  }

  const void_ = void 0
  void void_ // suppress unused

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Event Types</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Create booking types that students can schedule with you.
            </p>
          </div>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true) }}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            <Plus style={{ width: 16, height: 16 }} />
            New event type
          </button>
        </div>

        {calendarTypeRecords.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap style={{ width: 24, height: 24 }} className="text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No event types yet</h3>
            <p className="text-sm text-gray-500 mb-5">Create your first event type to start accepting bookings.</p>
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true) }}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <Plus style={{ width: 16, height: 16 }} />
              Create event type
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {calendarTypeRecords.map(record => {
              const stats = getSlotStats(record.name)
              const bookingUrl = getBookingUrl(record.name)
              const isMenuOpen = menuOpen === record.id

              return (
                <div key={record.id} className="event-type-card group">
                  {/* Color indicator */}
                  <div
                    className="w-1 self-stretch rounded-full mr-4 flex-shrink-0"
                    style={{ background: COLOR_BG[record.color] ?? '#4B5563', minHeight: 40 }}
                  />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{record.name}</h3>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: COLOR_LIGHT[record.color] ?? '#F3F4F6', color: COLOR_BG[record.color] ?? '#4B5563' }}
                      >
                        Active
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock style={{ width: 11, height: 11 }} />
                        {stats.total} slots total
                      </span>
                      <span className="flex items-center gap-1">
                        <Check style={{ width: 11, height: 11 }} />
                        {stats.booked} booked
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <LinkIcon style={{ width: 11, height: 11 }} />
                        <span className="truncate max-w-48">/book?type={record.name}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyLinkButton text={bookingUrl} />
                    <a
                      href={bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Preview booking page"
                    >
                      <ExternalLink style={{ width: 14, height: 14 }} />
                    </a>
                    <button
                      onClick={() => { setEditTarget(record); setModalOpen(true) }}
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil style={{ width: 14, height: 14 }} />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(isMenuOpen ? null : record.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      >
                        <MoreHorizontal style={{ width: 14, height: 14 }} />
                      </button>
                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-10 animate-slide-down">
                          <button
                            onClick={() => { setDeleteId(record.id); setMenuOpen(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info box */}
        <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Zap style={{ width: 15, height: 15 }} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Each event type gets a unique booking link. Share it with students or embed it on your site.
            Go to <strong>Availability</strong> to set your schedule for each event type.
          </p>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-scale-in">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Delete event type?</h2>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete this event type. Existing bookings will not be affected.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create modal */}
      {modalOpen && (
        <EditModal
          record={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
