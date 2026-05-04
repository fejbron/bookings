import { useMemo, useState, useEffect, useRef } from 'react'
import {
  format, startOfWeek, addDays, isToday,
  addWeeks, subWeeks,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Booking, CalendarTypeRecord, PresentationSlot } from '../types'
import { formatTime } from './TimeSlots'

// ── Constants ────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64        // px per hour
const START_HOUR  = 7         // 7 am
const END_HOUR    = 21        // 9 pm
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minToPx(min: number): number {
  return (min / 60) * HOUR_HEIGHT
}
function endTimeStr(time: string, duration: number): string {
  const total = timeToMinutes(time) + duration
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`
}

// ── Color map ─────────────────────────────────────────────────────────────────
const COLOR_BLOCK: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',    border: '#3B82F6', text: 'text-blue-900',    badge: 'bg-blue-100 text-blue-700',    dot: '#3B82F6' },
  purple: { bg: 'bg-purple-50',  border: '#A855F7', text: 'text-purple-900',  badge: 'bg-purple-100 text-purple-700', dot: '#A855F7' },
  green:  { bg: 'bg-emerald-50', border: '#10B981', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-700', dot: '#10B981' },
  grey:   { bg: 'bg-gray-50',    border: '#9CA3AF', text: 'text-gray-700',    badge: 'bg-gray-100 text-gray-600',    dot: '#9CA3AF' },
  orange: { bg: 'bg-orange-50',  border: '#F97316', text: 'text-orange-900',  badge: 'bg-orange-100 text-orange-700', dot: '#F97316' },
  pink:   { bg: 'bg-pink-50',    border: '#EC4899', text: 'text-pink-900',    badge: 'bg-pink-100 text-pink-700',    dot: '#EC4899' },
  teal:   { bg: 'bg-teal-50',    border: '#14B8A6', text: 'text-teal-900',    badge: 'bg-teal-100 text-teal-700',    dot: '#14B8A6' },
}
const FALLBACK_COLOR = COLOR_BLOCK.grey

function getStatusLabel(b: Booking, todayStr: string): { text: string; cls: string } {
  if (b.status === 'cancelled') return { text: 'Cancelled', cls: 'bg-red-100 text-red-600' }
  if (b.status === 'pending')   return { text: 'Pending',   cls: 'bg-amber-100 text-amber-700' }
  if (b.date < todayStr)        return { text: 'Completed', cls: 'bg-gray-100 text-gray-500' }
  if (b.date === todayStr) {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const startMin = timeToMinutes(b.time)
    if (nowMin >= startMin && nowMin < startMin + b.duration) return { text: 'In Progress', cls: 'bg-green-100 text-green-700' }
    if (nowMin >= startMin + b.duration) return { text: 'Completed', cls: 'bg-gray-100 text-gray-500' }
  }
  return { text: 'Confirmed', cls: 'bg-blue-100 text-blue-700' }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  bookings: Booking[]
  slots: PresentationSlot[]
  calendarTypeRecords: CalendarTypeRecord[]
  onSelectBooking: (b: Booking) => void
  selectedBookingId?: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CalendarView({ bookings, slots, calendarTypeRecords, onSelectBooking, selectedBookingId }: Props) {
  const [view, setView] = useState<'day' | 'week'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
      const offset = Math.max(0, minToPx(nowMin - START_HOUR * 60) - 120)
      scrollRef.current.scrollTop = offset
    }
  }, [])

  // Live current-time line position (updates every minute)
  const [nowPx, setNowPx] = useState(() => {
    const m = new Date().getHours() * 60 + new Date().getMinutes()
    return minToPx(m - START_HOUR * 60)
  })
  useEffect(() => {
    const update = () => {
      const m = new Date().getHours() * 60 + new Date().getMinutes()
      setNowPx(minToPx(m - START_HOUR * 60))
    }
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  // Week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [currentDate])

  // Day-view columns: one per calendar type, or single "All" if no types
  const dayColumns = useMemo(() => {
    if (calendarTypeRecords.length === 0) return [{ name: 'All', color: 'grey', dot: FALLBACK_COLOR.dot }]
    return calendarTypeRecords.map(t => ({
      name: t.name,
      color: t.color,
      dot: (COLOR_BLOCK[t.color] ?? FALLBACK_COLOR).dot,
    }))
  }, [calendarTypeRecords])

  // Filter helpers
  function bookingsForDate(date: Date, calType?: string): Booking[] {
    const ds = format(date, 'yyyy-MM-dd')
    return bookings.filter(b => {
      if (b.date !== ds || b.status === 'cancelled') return false
      if (calType && calType !== 'All') {
        const slot = slots.find(s => s.id === b.slotId)
        if (slot?.calendarType !== calType) return false
      }
      return true
    }).sort((a, b2) => a.time.localeCompare(b2.time))
  }

  function colorForBooking(b: Booking) {
    const slot = slots.find(s => s.id === b.slotId)
    const rec = calendarTypeRecords.find(t => t.name === slot?.calendarType)
    return COLOR_BLOCK[rec?.color ?? ''] ?? FALLBACK_COLOR
  }

  // Navigation
  function navigate(dir: 1 | -1) {
    if (view === 'day') {
      setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + dir); return n })
    } else {
      setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    }
  }

  // Booking block renderer (called inline, not as a React component to avoid hooks issues)
  function renderBlock(b: Booking, colIndex: number, totalCols: number) {
    const startMin = timeToMinutes(b.time)
    const topMin = startMin - START_HOUR * 60
    if (topMin < 0 || topMin >= (END_HOUR - START_HOUR) * 60) return null
    const top = minToPx(topMin)
    const height = Math.max(minToPx(b.duration), 28)
    const c = colorForBooking(b)
    const status = getStatusLabel(b, todayStr)
    const isSelected = b.id === selectedBookingId
    const isShort = height < 48

    // Side-by-side layout for overlapping (simplified: use colIndex offset)
    const widthPct = 100 / totalCols
    const leftPct = widthPct * colIndex

    return (
      <div
        key={b.id}
        onClick={() => onSelectBooking(b)}
        className={`absolute rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md hover:z-20 ${c.bg} ${isSelected ? 'ring-2 ring-gray-400 shadow-md z-20' : 'z-10'}`}
        style={{
          top,
          height,
          left: `${leftPct + 0.5}%`,
          width: `${widthPct - 1}%`,
          borderLeft: `3px solid ${c.border}`,
        }}
      >
        <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
          {isShort ? (
            <p className={`text-[10px] font-semibold truncate leading-tight ${c.text}`}>
              {formatTime(b.time)} {b.studentName}
            </p>
          ) : (
            <>
              <p className={`text-[11px] font-semibold truncate leading-tight ${c.text}`}>{b.studentName}</p>
              {height >= 56 && (
                <p className={`text-[10px] truncate opacity-60 leading-tight ${c.text}`}>{b.presentationTopic}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-1 pt-0.5">
                <p className={`text-[9px] opacity-60 ${c.text}`}>
                  {formatTime(b.time)} → {formatTime(endTimeStr(b.time, b.duration))}
                </p>
                <span className={`shrink-0 text-[8px] font-bold px-1 py-0.5 rounded leading-none ${status.cls}`}>
                  {status.text}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Time grid column (shared between day/week)
  function renderGridColumn(key: string, bookingList: Booking[], highlight = false) {
    // Simple overlap detection: group by overlapping time ranges
    type BookingGroup = Booking[]
    const groups: BookingGroup[] = []
    const sorted = [...bookingList].sort((a, b) => a.time.localeCompare(b.time))

    for (const b of sorted) {
      const startMin = timeToMinutes(b.time)
      const endMin = startMin + b.duration
      const group = groups.find(g =>
        g.some(gb => {
          const gs = timeToMinutes(gb.time)
          const ge = gs + gb.duration
          return startMin < ge && endMin > gs
        })
      )
      if (group) group.push(b)
      else groups.push([b])
    }

    const showNow = highlight && nowPx > 0 && nowPx < TOTAL_HEIGHT

    return (
      <div
        key={key}
        className={`flex-1 relative border-l border-[var(--border)] ${highlight ? 'bg-blue-50/20' : ''}`}
      >
        {/* Hour lines */}
        {HOURS.map(h => (
          <div
            key={h}
            className="absolute w-full border-t border-[var(--border)]"
            style={{ top: minToPx((h - START_HOUR) * 60) }}
          />
        ))}
        {/* Half-hour dashed lines */}
        {HOURS.slice(0, -1).map(h => (
          <div
            key={`${h}h`}
            className="absolute w-full border-t border-dashed border-gray-100"
            style={{ top: minToPx((h - START_HOUR) * 60 + 30) }}
          />
        ))}

        {/* Booking blocks — render groups with side-by-side layout */}
        {groups.map((group, _gi) =>
          group.map((b, i) => renderBlock(b, i, group.length))
        )}

        {/* Current time line */}
        {showNow && (
          <div
            className="absolute w-full z-30 pointer-events-none"
            style={{ top: nowPx }}
          >
            <div className="relative flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5" />
              <div className="flex-1 h-px bg-red-500" />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Date label ───────────────────────────────────────────────────────────────
  const dateLabel = view === 'day'
    ? format(currentDate, 'EEEE, d MMMM yyyy')
    : `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM yyyy')}`

  const totalBookingsToday = view === 'day'
    ? bookingsForDate(currentDate).length
    : weekDays.reduce((acc, d) => acc + bookingsForDate(d).length, 0)

  return (
    <div
      className="bg-white rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ boxShadow: 'var(--card-shadow)' }}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[var(--text-muted)]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[var(--text-muted)]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] ml-1">{dateLabel}</span>
          <span className="text-xs text-[var(--text-muted)] ml-2">{totalBookingsToday} booking{totalBookingsToday !== 1 ? 's' : ''}</span>
        </div>

        {/* Day / Week toggle */}
        <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
          {(['day', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3.5 py-1.5 text-xs font-semibold transition-colors capitalize ${
                view === v
                  ? 'bg-[var(--text-primary)] text-white'
                  : 'text-[var(--text-muted)] hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column headers ── */}
      <div className="flex border-b border-[var(--border)]" style={{ paddingLeft: 52 }}>
        {view === 'day'
          ? dayColumns.map(col => {
              const count = bookingsForDate(currentDate, col.name).length
              return (
                <div key={col.name} className="flex-1 px-3 py-2 text-center border-l border-[var(--border)]">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.dot }} />
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{col.name}</p>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{count} booking{count !== 1 ? 's' : ''}</p>
                </div>
              )
            })
          : weekDays.map(day => {
              const count = bookingsForDate(day).length
              const now = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 px-2 py-2 text-center border-l border-[var(--border)] cursor-pointer hover:bg-gray-50 transition-colors ${now ? 'bg-[var(--accent-light)]' : ''}`}
                  onClick={() => { setCurrentDate(day); setView('day') }}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${now ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                    {format(day, 'EEE')}
                  </p>
                  <div className={`text-lg font-bold leading-tight mx-auto w-8 h-8 flex items-center justify-center rounded-full ${
                    now ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-primary)]'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  {count > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                        <span key={i} className="w-1 h-1 rounded-full bg-[var(--accent)]" />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
        }
      </div>

      {/* ── Scrollable time grid ── */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 560 }}>
        <div className="flex" style={{ height: TOTAL_HEIGHT }}>
          {/* Time gutter */}
          <div className="shrink-0 relative" style={{ width: 52 }}>
            {HOURS.map(h => (
              <div key={h} className="absolute w-full" style={{ top: minToPx((h - START_HOUR) * 60) - 8 }}>
                <span className="absolute right-2 text-[10px] text-[var(--text-muted)] font-medium select-none">
                  {h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Columns */}
          {view === 'day'
            ? dayColumns.map(col =>
                renderGridColumn(col.name, bookingsForDate(currentDate, col.name), isToday(currentDate))
              )
            : weekDays.map(day =>
                renderGridColumn(day.toISOString(), bookingsForDate(day), isToday(day))
              )
          }
        </div>
      </div>
    </div>
  )
}
