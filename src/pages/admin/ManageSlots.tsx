import { useState, useMemo } from 'react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { Plus, Trash2, Calendar, Clock, AlertTriangle, Info, User, Users } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import { formatTime } from '../../components/TimeSlots'

export default function ManageSlots() {
  const { slots, bookings, slotConfigs, generateSlots, removeSlot, clearAllSlots } = useBookings()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [duration, setDuration] = useState(15)
  const [excludeWeekends, setExcludeWeekends] = useState(true)
  const [lecturerName, setLecturerName] = useState('')
  const [classGroup, setClassGroup] = useState('')
  const [generated, setGenerated] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const bookedSlotIds = new Set(bookings.filter(b => b.status === 'confirmed').map(b => b.slotId))
  const canGenerate = startDate && endDate && startDate <= endDate && startTime < endTime

  const previewInfo = useMemo(() => {
    if (!canGenerate) return null
    try {
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
      const filtered = excludeWeekends ? days.filter(d => d.getDay() !== 0 && d.getDay() !== 6) : days
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const totalMin = (eh * 60 + em) - (sh * 60 + sm)
      const perDay = Math.floor(totalMin / duration)
      return { days: filtered.length, perDay, total: filtered.length * perDay }
    } catch { return null }
  }, [canGenerate, startDate, endDate, startTime, endTime, duration, excludeWeekends])

  const groupedSlots = useMemo(() => {
    const groups: Record<string, typeof slots> = {}
    const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    for (const s of sorted) {
      if (!groups[s.date]) groups[s.date] = []
      groups[s.date].push(s)
    }
    return groups
  }, [slots])

  const dates = Object.keys(groupedSlots).sort()

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    const result = generateSlots({ startDate, endDate, startTime, endTime, duration, excludeWeekends, lecturerName: lecturerName.trim() || undefined, classGroup: classGroup.trim() || undefined })
    setGenerated(result.length)
    setTimeout(() => setGenerated(null), 4000)
  }

  const fieldCls = "w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition bg-white"

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Availability</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Set available dates and times for student presentations.</p>
        </div>

        {/* Generator */}
        <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 mb-8 animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--accent)]" />
            Generate Slots
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={fieldCls} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Slot Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className={fieldCls}>
                {[5, 10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} minutes</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeWeekends}
                  onChange={e => setExcludeWeekends(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text-primary)]">Exclude weekends</span>
              </label>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Lecturer Name <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={lecturerName}
                  onChange={e => setLecturerName(e.target.value)}
                  placeholder="e.g. Dr. Mensah"
                  className={`${fieldCls} pl-8`}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Class Group <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={classGroup}
                  onChange={e => setClassGroup(e.target.value)}
                  placeholder="e.g. CS Year 3"
                  className={`${fieldCls} pl-8`}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewInfo && previewInfo.total > 0 && (
            <div className="mb-5 flex items-start gap-2 text-sm text-[var(--accent)] bg-[var(--accent-light)] rounded-lg p-3 border border-orange-100">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This will create <strong>{previewInfo.total}</strong> slot{previewInfo.total !== 1 ? 's' : ''} across{' '}
                <strong>{previewInfo.days}</strong> day{previewInfo.days !== 1 ? 's' : ''} ({previewInfo.perDay} per day · {duration} min each)
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canGenerate}
              className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Generate Slots
            </button>
            {generated !== null && (
              <span className="text-sm text-emerald-600 font-medium animate-fade-in">
                ✓ {generated} slot{generated !== 1 ? 's' : ''} created!
              </span>
            )}
          </div>
        </form>

        {slotConfigs.length > 0 && (
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Last generated: {format(parseISO(slotConfigs[0].createdAt), 'MMM d, yyyy h:mm a')} · {slotConfigs[0].duration} min slots, {slotConfigs[0].startTime}–{slotConfigs[0].endTime}
          </p>
        )}

        {/* Slots list header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            All Slots <span className="text-[var(--text-muted)] font-normal">({slots.length})</span>
          </h2>
          {slots.length > 0 && (
            showClearConfirm ? (
              <div className="flex items-center gap-2 text-sm animate-scale-in">
                <span className="text-[var(--text-muted)]">Clear all?</span>
                <button onClick={() => { clearAllSlots(); setShowClearConfirm(false) }} className="text-red-500 font-semibold hover:text-red-600">Yes</button>
                <button onClick={() => setShowClearConfirm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">No</button>
              </div>
            ) : (
              <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium">
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )
          )}
        </div>

        {dates.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center animate-fade-in">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No slots yet. Use the form above to generate slots.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dates.map((date, di) => {
              const ds = groupedSlots[date]
              const bookedInDay = ds.filter(s => bookedSlotIds.has(s.id)).length
              const pct = Math.round((bookedInDay / ds.length) * 100)
              return (
                <div key={date} className="bg-white rounded-xl border border-[var(--border)] overflow-hidden animate-fade-in-up" style={{ animationDelay: `${Math.min(di * 40, 240)}ms` }}>
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-[var(--border)]">
                    <Calendar className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</span>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                      {bookedInDay > 0 ? `${bookedInDay}/${ds.length} booked` : `${ds.length} slots`}
                    </span>
                  </div>
                  {bookedInDay > 0 && (
                    <div className="h-0.5 bg-gray-100">
                      <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="p-3 flex flex-wrap gap-2">
                    {ds.map(slot => {
                      const isBooked = bookedSlotIds.has(slot.id)
                      return (
                        <div key={slot.id} className={`group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg text-xs border transition-all ${isBooked ? 'bg-[var(--accent-light)] border-orange-200 text-[var(--accent)]' : 'bg-gray-50 border-[var(--border)] text-[var(--text-secondary)] hover:border-gray-300'}`}>
                          <Clock className="w-3 h-3 opacity-50" />
                          <span className="font-medium">{formatTime(slot.time)}</span>
                          <span className="opacity-60">{slot.duration}m</span>
                          {slot.lecturerName && (
                            <span className="flex items-center gap-1 opacity-70">
                              <User className="w-3 h-3" />{slot.lecturerName}
                            </span>
                          )}
                          {slot.classGroup && (
                            <span className="flex items-center gap-1 opacity-70">
                              <Users className="w-3 h-3" />{slot.classGroup}
                            </span>
                          )}
                          {isBooked ? (
                            <span className="text-[10px] bg-orange-100 text-[var(--accent)] px-1.5 py-0.5 rounded font-medium">Booked</span>
                          ) : (
                            <button onClick={() => removeSlot(slot.id)} className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {slots.some(s => bookedSlotIds.has(s.id)) && (
          <div className="mt-5 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Booked slots cannot be removed. Cancel the booking first from the Dashboard.</span>
          </div>
        )}
      </div>
    </div>
  )
}
