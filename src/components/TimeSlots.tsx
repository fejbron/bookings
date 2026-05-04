import type { PresentationSlot } from '../types'

interface TimeSlotsProps {
  slots: PresentationSlot[]
  selected: string | null
  onSelect: (slotId: string) => void
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')}${period}`
}

export default function TimeSlots({ slots, selected, onSelect }: TimeSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
        <svg className="w-8 h-8 mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <p className="text-sm">No available slots for this date.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {slots.map(slot => {
        const isSelected = selected === slot.id
        return (
          <button
            key={slot.id}
            onClick={() => onSelect(slot.id)}
            className={`w-full py-3 px-5 rounded-full text-sm font-semibold border-2 transition-all text-left flex items-center justify-between ${
              isSelected
                ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-sm'
                : 'bg-white border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)]'
            }`}
          >
            <span>{formatTime(slot.time)}</span>
            <span className={`text-xs font-normal ${isSelected ? 'text-blue-200' : 'text-[var(--text-muted)]'}`}>
              {slot.duration} min
            </span>
          </button>
        )
      })}
    </div>
  )
}
