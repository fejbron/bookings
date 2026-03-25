import { Clock } from 'lucide-react'
import type { PresentationSlot } from '../types'

interface TimeSlotsProps {
  slots: PresentationSlot[]
  selected: string | null
  onSelect: (slotId: string) => void
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export default function TimeSlots({ slots, selected, onSelect }: TimeSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className="text-center py-10 text-[var(--text-muted)]">
        <Clock className="w-7 h-7 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No available slots for this date.</p>
      </div>
    )
  }

  const morning = slots.filter(s => parseInt(s.time) < 12)
  const afternoon = slots.filter(s => parseInt(s.time) >= 12)

  const renderGroup = (label: string, items: PresentationSlot[]) => {
    if (items.length === 0) return null
    return (
      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] mb-2.5 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> {label}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map(slot => {
            const isSelected = selected === slot.id
            return (
              <button
                key={slot.id}
                onClick={() => onSelect(slot.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                    : 'bg-white text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)]'
                }`}
              >
                <span>{formatTime(slot.time)}</span>
                <span className={`text-xs ${isSelected ? 'text-orange-200' : 'text-[var(--text-muted)]'}`}>
                  {slot.duration}m
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {renderGroup('Morning', morning)}
      {renderGroup('Afternoon', afternoon)}
    </div>
  )
}

export { formatTime }
