import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isBefore, addMonths, subMonths, startOfDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  availableDates?: string[]
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar({ selected, onSelect, availableDates }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  const availableSet = availableDates ? new Set(availableDates) : null
  const canGoPrev = !isBefore(startOfMonth(subMonths(currentMonth, 1)), startOfMonth(today))

  return (
    <div className="bg-white rounded-xl border border-[var(--border)] p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-[var(--text-secondary)]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAYS.map(day => (
          <div key={day} className="text-center text-[10px] font-medium text-[var(--text-muted)] py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isPast = isBefore(day, today)
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasSlots = availableSet ? availableSet.has(dateStr) : true
          const disabled = isPast || !isCurrentMonth || (availableSet !== null && !hasSlots)
          const isSelected = selected && isSameDay(day, selected)
          const isToday = isSameDay(day, today)

          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={`
                relative h-9 w-full rounded-lg text-xs font-medium transition-all
                ${disabled
                  ? 'text-gray-200 cursor-not-allowed'
                  : isSelected
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : isToday
                      ? 'bg-[var(--accent-light)] text-[var(--accent)] ring-1 ring-[var(--accent)] ring-opacity-30'
                      : 'text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]'
                }
              `}
            >
              {format(day, 'd')}
              {availableSet && hasSlots && !isPast && isCurrentMonth && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          )
        })}
      </div>

      {availableSet && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          Available dates
        </div>
      )}
    </div>
  )
}
