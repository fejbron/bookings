import { useState, useMemo } from 'react'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { Plus, Trash2, Calendar, Clock, AlertTriangle, Info, Users, ChevronDown, X } from 'lucide-react'
import { useSlots, useBookings, useEventTypes } from '../../hooks'
import { formatTime } from '../../components/TimeSlots'
import type { CalendarTypeRecord } from '../../types'

export default function DashboardSlots() {
  const { slots, slotConfigs, generate: generateSlots, remove: removeSlot, clearAll: clearAllSlots } = useSlots()
  const { bookings } = useBookings()
  const { types: calendarTypeRecords, create: addCalendarType, remove: deleteCalendarType } = useEventTypes()

  const [calendarType, setCalendarType] = useState('')
  const [showAddType, setShowAddType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('blue')
  const [addTypeLoading, setAddTypeLoading] = useState(false)
  const [addTypeError, setAddTypeError] = useState('')
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [duration, setDuration] = useState(15)
  const [breakBetween, setBreakBetween] = useState(0)
  const [excludeWeekends, setExcludeWeekends] = useState(true)
  const [classGroup, setClassGroup] = useState('')
  const [generated, setGenerated] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [filterCalendarType, setFilterCalendarType] = useState('')
  const [expandedPastDates, setExpandedPastDates] = useState<Set<string>>(new Set())

  const COLOR_ACTIVE: Record<string, string> = {
    blue: 'bg-[var(--accent)] border-[var(--accent)] text-white',
    purple: 'bg-purple-600 border-purple-600 text-white',
    green: 'bg-emerald-600 border-emerald-600 text-white',
    grey: 'bg-gray-600 border-gray-600 text-white',
    orange: 'bg-orange-500 border-orange-500 text-white',
    pink: 'bg-pink-600 border-pink-600 text-white',
    teal: 'bg-teal-600 border-teal-600 text-white',
  }
  const COLOR_IDLE: Record<string, string> = {
    blue: 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]',
    purple: 'border-purple-300 bg-purple-50 text-purple-700',
    green: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    grey: 'border-gray-300 bg-gray-50 text-gray-600',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    pink: 'border-pink-300 bg-pink-50 text-pink-700',
    teal: 'border-teal-300 bg-teal-50 text-teal-700',
  }
  const COLOR_BADGE: Record<string, string> = {
    blue: 'bg-[var(--accent-light)] text-[var(--accent)]', purple: 'bg-purple-50 text-purple-700',
    green: 'bg-emerald-50 text-emerald-700', grey: 'bg-gray-100 text-gray-600',
    orange: 'bg-orange-50 text-orange-700', pink: 'bg-pink-50 text-pink-700', teal: 'bg-teal-50 text-teal-700',
  }

  function typeColor(t: CalendarTypeRecord) { return t.color in COLOR_ACTIVE ? t.color : 'grey' }
  function slotBadgeClass(calType: string) {
    const record = calendarTypeRecords.find(t => t.name === calType)
    return COLOR_BADGE[record?.color ?? 'grey'] ?? 'bg-gray-100 text-gray-600'
  }

  const effectiveCalendarType = calendarType || (calendarTypeRecords[0]?.name ?? '')
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
      const step = duration + breakBetween
      const perDay = Math.max(0, Math.floor((totalMin - duration) / step) + 1)
      return { days: filtered.length, perDay, total: filtered.length * perDay }
    } catch { return null }
  }, [canGenerate, startDate, endDate, startTime, endTime, duration, breakBetween, excludeWeekends])

  const today = new Date().toISOString().slice(0, 10)

  const groupedSlots = useMemo(() => {
    const groups: Record<string, typeof slots> = {}
    for (const s of [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))) {
      if (!groups[s.date]) groups[s.date] = []
      groups[s.date].push(s)
    }
    return groups
  }, [slots])

  const allCalendarTypes = useMemo(() => [...new Set(slots.map(s => s.calendarType))].sort(), [slots])
  const allDates = Object.keys(groupedSlots).sort()
  const pastDates = allDates.filter(d => d < today)
  const upcomingDates = allDates.filter(d => d >= today)
  const visibleDates = showPast ? allDates : upcomingDates

  function togglePastDate(date: string) {
    setExpandedPastDates(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n })
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    const result = await generateSlots({ startDate, endDate, startTime, endTime, duration, breakBetween, excludeWeekends, calendarType: effectiveCalendarType, classGroup: classGroup.trim() || undefined })
    setGenerated(result.length)
    setTimeout(() => setGenerated(null), 4000)
  }

  async function handleAddType() {
    const name = newTypeName.trim()
    if (!name) return
    if (calendarTypeRecords.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      setAddTypeError('A type with this name already exists.')
      return
    }
    setAddTypeLoading(true)
    setAddTypeError('')
    try {
      const created = await addCalendarType({ name, color: newTypeColor })
      setCalendarType(created.name)
      setNewTypeName(''); setNewTypeColor('blue'); setShowAddType(false)
    } catch (err) {
      setAddTypeError(err instanceof Error ? err.message : 'Failed to create type.')
    } finally {
      setAddTypeLoading(false)
    }
  }

  async function handleDeleteType(id: string) {
    setDeleteTypeId(null)
    await deleteCalendarType(id)
    if (calendarType === calendarTypeRecords.find(t => t.id === id)?.name) {
      setCalendarType(calendarTypeRecords.find(t => t.id !== id)?.name ?? '')
    }
  }

  const fieldCls = "w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition bg-white"

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Availability</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Generate time slots that people can book.</p>
        </div>

        {/* Generator */}
        <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 mb-8">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--accent)]" /> Generate Slots
          </h2>

          {/* Calendar type selector */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Session Type</label>
              <button type="button" onClick={() => { setShowAddType(v => !v); setAddTypeError('') }} className="text-xs text-[var(--accent)] hover:underline font-medium">
                {showAddType ? 'Cancel' : '+ Add type'}
              </button>
            </div>

            {calendarTypeRecords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {calendarTypeRecords.map(t => {
                  const c = typeColor(t)
                  const isSelected = effectiveCalendarType === t.name
                  return (
                    <div key={t.id} className="relative group/pill">
                      <button type="button" onClick={() => setCalendarType(t.name)}
                        className={`pl-3.5 pr-7 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${isSelected ? COLOR_ACTIVE[c] : `${COLOR_IDLE[c]}`}`}>
                        {t.name}
                      </button>
                      <button type="button" onClick={() => setDeleteTypeId(t.id)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full opacity-0 group-hover/pill:opacity-60 hover:!opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No session types yet — add one above.</p>
            )}

            {showAddType && (
              <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-[var(--border)] space-y-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={newTypeName} onChange={e => { setNewTypeName(e.target.value); setAddTypeError('') }} placeholder="e.g. Consultation" maxLength={50} className={`${fieldCls} flex-1`} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddType() } }} autoFocus />
                  <button type="button" onClick={handleAddType} disabled={!newTypeName.trim() || addTypeLoading} className="px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                    {addTypeLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['blue', 'purple', 'green', 'grey', 'orange', 'pink', 'teal'].map(color => (
                    <button key={color} type="button" onClick={() => setNewTypeColor(color)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 capitalize transition-all ${newTypeColor === color ? COLOR_ACTIVE[color] : `${COLOR_IDLE[color]} opacity-70 hover:opacity-100`}`}>
                      {color}
                    </button>
                  ))}
                </div>
                {addTypeError && <p className="text-xs text-red-500">{addTypeError}</p>}
              </div>
            )}

            {deleteTypeId && (
              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>Delete <strong>{calendarTypeRecords.find(t => t.id === deleteTypeId)?.name}</strong>? Existing slots keep their type.</span>
                <button type="button" onClick={() => handleDeleteType(deleteTypeId)} className="text-red-500 font-semibold hover:text-red-600">Yes</button>
                <button type="button" onClick={() => setDeleteTypeId(null)} className="text-[var(--text-muted)]">No</button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} /></div>
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className={fieldCls} /></div>
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldCls} /></div>
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={fieldCls} /></div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className={fieldCls}>
                {[5, 10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} minutes</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Break between</label>
              <select value={breakBetween} onChange={e => setBreakBetween(Number(e.target.value))} className={fieldCls}>
                {[0, 5, 10, 15, 20, 30, 60].map(v => <option key={v} value={v}>{v === 0 ? 'No break' : `${v} min`}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={excludeWeekends} onChange={e => setExcludeWeekends(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Skip weekends</span>
              </label>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Class / Group <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input type="text" value={classGroup} onChange={e => setClassGroup(e.target.value)} placeholder="e.g. Year 3 CS" maxLength={100} className={`${fieldCls} pl-8`} />
            </div>
          </div>

          {previewInfo && previewInfo.total > 0 && (
            <div className="mb-5 flex items-start gap-2 text-sm text-[var(--accent)] bg-[var(--accent-light)] rounded-lg p-3 border border-orange-100">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Creates <strong>{previewInfo.total}</strong> slots across <strong>{previewInfo.days}</strong> day{previewInfo.days !== 1 ? 's' : ''} ({previewInfo.perDay} per day · {duration} min each)</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={!canGenerate || !effectiveCalendarType} className="flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Generate Slots
            </button>
            {generated !== null && <span className="text-sm text-emerald-600 font-medium">✓ {generated} slot{generated !== 1 ? 's' : ''} created!</span>}
          </div>
        </form>

        {slotConfigs.length > 0 && (
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Last generated: {format(parseISO(slotConfigs[0].createdAt), 'MMM d, yyyy h:mm a')} · {slotConfigs[0].duration}min slots
          </p>
        )}

        {/* Slot list */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {showPast ? 'All Slots' : 'Upcoming Slots'} <span className="text-[var(--text-muted)] font-normal">({visibleDates.length} date{visibleDates.length !== 1 ? 's' : ''})</span>
          </h2>
          {slots.length > 0 && (showClearConfirm ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Clear all?</span>
              <button onClick={() => { clearAllSlots(); setShowClearConfirm(false) }} className="text-red-500 font-semibold">Yes</button>
              <button onClick={() => setShowClearConfirm(false)} className="text-[var(--text-muted)]">No</button>
            </div>
          ) : (
            <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          ))}
        </div>

        {allCalendarTypes.length > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button onClick={() => setFilterCalendarType('')} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${!filterCalendarType ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-white' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>All</button>
            {allCalendarTypes.map(type => {
              const record = calendarTypeRecords.find(t => t.name === type)
              const c = record?.color && record.color in COLOR_ACTIVE ? record.color : 'grey'
              return (
                <button key={type} onClick={() => setFilterCalendarType(type === filterCalendarType ? '' : type)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors ${filterCalendarType === type ? COLOR_ACTIVE[c] : COLOR_IDLE[c]}`}>
                  {type}
                </button>
              )
            })}
          </div>
        )}

        {allDates.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--border)] p-12 text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No slots yet. Use the form above to generate slots.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastDates.length > 0 && (
              <button onClick={() => setShowPast(p => !p)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:bg-gray-50 transition-colors">
                <Calendar className="w-3.5 h-3.5" />
                {showPast ? 'Hide past dates' : `Show ${pastDates.length} past date${pastDates.length !== 1 ? 's' : ''}`}
              </button>
            )}
            {upcomingDates.length === 0 && !showPast && (
              <div className="bg-white rounded-xl border border-[var(--border)] p-10 text-center">
                <p className="text-sm text-[var(--text-muted)]">No upcoming slots. Generate new ones above.</p>
              </div>
            )}
            {visibleDates.map((date, di) => {
              const isPast = date < today
              const isExpanded = !isPast || expandedPastDates.has(date)
              const allDaySlots = groupedSlots[date]
              const ds = filterCalendarType ? allDaySlots.filter(s => s.calendarType === filterCalendarType) : allDaySlots
              if (ds.length === 0) return null
              const bookedInDay = ds.filter(s => bookedSlotIds.has(s.id)).length
              const pct = Math.round((bookedInDay / ds.length) * 100)
              return (
                <div key={date} className={`rounded-xl border overflow-hidden ${isPast ? 'bg-gray-50 border-[var(--border)] opacity-60' : 'bg-white border-[var(--border)]'}`} style={{ animationDelay: `${Math.min(di * 40, 240)}ms` }}>
                  <div className={`px-4 py-3 flex items-center gap-2 ${isExpanded ? 'border-b border-[var(--border)]' : ''} ${isPast ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                    onClick={isPast ? () => togglePastDate(date) : undefined}>
                    <Calendar className="w-4 h-4 text-[var(--accent)]" />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</span>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">{bookedInDay > 0 ? `${bookedInDay}/${ds.length} booked` : `${ds.length} slot${ds.length !== 1 ? 's' : ''}`}</span>
                    {isPast && <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />}
                  </div>
                  {isExpanded && bookedInDay > 0 && <div className="h-0.5 bg-gray-100"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} /></div>}
                  {isExpanded && (
                    <div className="p-3 flex flex-wrap gap-2">
                      {ds.map(slot => {
                        const isBooked = bookedSlotIds.has(slot.id)
                        return (
                          <div key={slot.id} className={`group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg text-xs border transition-all ${isBooked ? 'bg-[var(--accent-light)] border-orange-200 text-[var(--accent)]' : 'bg-gray-50 border-[var(--border)] text-[var(--text-secondary)] hover:border-gray-300'}`}>
                            <Clock className="w-3 h-3 opacity-50" />
                            <span className="font-medium">{formatTime(slot.time)}</span>
                            <span className="opacity-60">{slot.duration}m</span>
                            {!filterCalendarType && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${slotBadgeClass(slot.calendarType)}`}>{slot.calendarType}</span>}
                            {slot.classGroup && <span className="flex items-center gap-1 opacity-70"><Users className="w-3 h-3" />{slot.classGroup}</span>}
                            {isBooked
                              ? <span className="text-[10px] bg-orange-100 text-[var(--accent)] px-1.5 py-0.5 rounded font-medium">Booked</span>
                              : <button onClick={() => removeSlot(slot.id)} className="p-0.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3 h-3" /></button>
                            }
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {slots.some(s => bookedSlotIds.has(s.id)) && (
          <div className="mt-5 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-3 border border-amber-100">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Booked slots cannot be removed. Cancel the booking first from the Bookings page.</span>
          </div>
        )}
      </div>
    </div>
  )
}
