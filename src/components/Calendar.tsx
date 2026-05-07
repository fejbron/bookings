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
  dark?: boolean
}

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function Calendar({ selected, onSelect, availableDates, dark = false }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = startOfDay(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  const availableSet = availableDates ? new Set(availableDates) : null
  const canGoPrev = !isBefore(startOfMonth(subMonths(currentMonth, 1)), startOfMonth(today))

  const c = dark ? {
    navHover: 'hover:bg-zinc-800',
    navIcon: 'text-zinc-400',
    title: 'text-white',
    weekday: 'text-zinc-500',
    outsideMonth: 'text-zinc-800',
    pastDay: 'text-zinc-700',
    selectedDay: 'bg-white text-black font-bold',
    todayDay: 'border-2 border-white text-white font-bold',
    availableDay: 'text-white hover:bg-zinc-800 font-semibold',
    unavailableDay: 'text-zinc-600',
    availableDot: 'bg-white',
    legendText: 'text-zinc-500',
    legendDot: 'bg-white',
  } : {
    navHover: 'hover:bg-gray-100',
    navIcon: 'text-gray-600',
    title: 'text-gray-900',
    weekday: 'text-gray-400',
    outsideMonth: 'text-gray-200',
    pastDay: 'text-gray-300',
    selectedDay: 'bg-gray-900 text-white font-bold',
    todayDay: 'border-2 border-gray-900 text-gray-900 font-bold',
    availableDay: 'text-gray-900 hover:bg-gray-100 font-semibold',
    unavailableDay: 'text-gray-400',
    availableDot: 'bg-gray-900',
    legendText: 'text-gray-400',
    legendDot: 'bg-gray-900',
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={!canGoPrev}
          className={`p-1.5 rounded-lg ${c.navHover} transition-colors disabled:opacity-20 disabled:cursor-not-allowed ${c.navIcon}`}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <h3 className={`text-sm font-semibold ${c.title}`}>
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className={`p-1.5 rounded-lg ${c.navHover} transition-colors ${c.navIcon}`}
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map(day => (
          <div key={day} className={`flex items-center justify-center text-[11px] font-semibold py-1.5 ${c.weekday}`}>
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
                    ? `${c.outsideMonth} cursor-default`
                    : disabled
                      ? `${c.pastDay} cursor-not-allowed`
                      : isSelected
                        ? c.selectedDay
                        : isToday
                          ? c.todayDay
                          : isAvailable
                            ? c.availableDay
                            : c.unavailableDay
                  }
                `}
              >
                {format(day, 'd')}
                {isAvailable && !isSelected && availableSet && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${c.availableDot}`} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {availableSet && (
        <div className={`mt-4 flex items-center gap-1.5 text-[11px] ${c.legendText}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.legendDot}`} />
          Available dates
        </div>
      )}
    </div>
  )
}
