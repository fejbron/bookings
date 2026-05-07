import type { PresentationSlot } from '../types'

interface TimeSlotsProps {
  slots: PresentationSlot[]
  selected: string | null
  onSelect: (slotId: string) => void
  dark?: boolean
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')}${period}`
}

export default function TimeSlots({ slots, selected, onSelect, dark = false }: TimeSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-10 ${dark ? 'text-zinc-600' : 'text-gray-400'}`}>
        <svg style={{ width: 28, height: 28, opacity: 0.3 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-3">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        <p className="text-xs">No slots available</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {slots.map(slot => {
        const isSelected = selected === slot.id
        const cls = dark
          ? isSelected
            ? 'bg-white border-white text-black'
            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-white hover:text-white'
          : isSelected
            ? 'bg-gray-900 border-gray-900 text-white'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900'
        return (
          <button
            key={slot.id}
            onClick={() => onSelect(slot.id)}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all text-left flex items-center justify-between ${cls}`}
          >
            <span>{formatTime(slot.time)}</span>
            <span className={`text-xs font-normal ${dark ? (isSelected ? 'text-zinc-600' : 'text-zinc-500') : 'text-gray-400'}`}>
              {slot.duration}m
            </span>
          </button>
        )
      })}
    </div>
  )
}
