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

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Calendar({ selected, onSelect, availableDates }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  const availableSet = availableDates ? new Set(availableDates) : null
  const canGoPrev = !isBefore(startOfMonth(subMonths(currentMonth, 1)), startOfMonth(today))

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoPrev}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-25 disabled:cursor-not-allowed text-[var(--text-secondary)]"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-[var(--text-secondary)]"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(day => (
          <div key={day} className="flex items-center justify-center text-[11px] font-semibold text-[var(--text-muted)] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isPast = isBefore(day, today)
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasSlots = availableSet ? availableSet.has(dateStr) : true
          const disabled = isPast || !isCurrentMonth || (availableSet !== null && !hasSlots)
          const isSelected = selected && isSameDay(day, selected)
          const isToday = isSameDay(day, today)
          const isAvailable = !disabled && isCurrentMonth && (!availableSet || hasSlots)

          return (
            <div key={i} className="flex items-center justify-center py-0.5">
              <button
                disabled={disabled}
                onClick={() => onSelect(day)}
                className={`
                  relative w-9 h-9 rounded-full text-sm font-medium transition-all
                  ${!isCurrentMonth
                    ? 'text-gray-200 cursor-default'
                    : disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isSelected
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : isToday
                          ? 'border-2 border-[var(--accent)] text-[var(--accent)] font-bold'
                          : isAvailable
                            ? 'text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)] font-semibold'
                            : 'text-[var(--text-muted)]'
                  }
                `}
              >
                {format(day, 'd')}
                {isAvailable && !isSelected && availableSet && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent)]" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {availableSet && (
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
          Available dates
        </div>
      )}
    </div>
  )
}
