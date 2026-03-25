import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import type { PresentationSlot, SlotConfig, Booking } from '../types'

export interface AdminSettings {
  welcomeMessage: string
  allowSelfCancel: boolean
}

const DEFAULT_SETTINGS: AdminSettings = {
  welcomeMessage: '',
  allowSelfCancel: true,
}

interface BookingContextType {
  slots: PresentationSlot[]
  bookings: Booking[]
  slotConfigs: SlotConfig[]
  adminSettings: AdminSettings

  generateSlots: (config: Omit<SlotConfig, 'id' | 'createdAt'>) => PresentationSlot[]
  removeSlot: (id: string) => void
  clearAllSlots: () => void

  getAvailableDates: () => string[]
  getAvailableSlots: (date: string) => PresentationSlot[]
  bookSlot: (slotId: string, data: { studentName: string; studentEmail: string; presentationTopic: string; notes: string }) => Booking
  getStudentBookings: (email: string) => Booking[]
  cancelBooking: (id: string) => void

  getBookingsForDateRange: (start: string, end: string) => Booking[]
  exportBookingsCSV: () => void
  updateAdminSettings: (settings: Partial<AdminSettings>) => void
}

const BookingContext = createContext<BookingContextType | null>(null)

const SLOTS_KEY = 'bookslot-slots'
const BOOKINGS_KEY = 'bookslot-bookings'
const CONFIGS_KEY = 'bookslot-configs'
const SETTINGS_KEY = 'bookslot-admin-settings'

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<PresentationSlot[]>(() => load(SLOTS_KEY))
  const [bookings, setBookings] = useState<Booking[]>(() => load(BOOKINGS_KEY))
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>(() => load(CONFIGS_KEY))
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => loadSettings())

  useEffect(() => { localStorage.setItem(SLOTS_KEY, JSON.stringify(slots)) }, [slots])
  useEffect(() => { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings)) }, [bookings])
  useEffect(() => { localStorage.setItem(CONFIGS_KEY, JSON.stringify(slotConfigs)) }, [slotConfigs])
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(adminSettings)) }, [adminSettings])

  const bookedSlotIds = new Set(
    bookings.filter(b => b.status === 'confirmed').map(b => b.slotId)
  )

  const generateSlots = useCallback((config: Omit<SlotConfig, 'id' | 'createdAt'>): PresentationSlot[] => {
    const days = eachDayOfInterval({
      start: parseISO(config.startDate),
      end: parseISO(config.endDate),
    })

    const newSlots: PresentationSlot[] = []
    const [startH, startM] = config.startTime.split(':').map(Number)
    const [endH, endM] = config.endTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    for (const day of days) {
      if (config.excludeWeekends && (day.getDay() === 0 || day.getDay() === 6)) continue

      const dateStr = format(day, 'yyyy-MM-dd')
      let current = startMinutes

      while (current + config.duration <= endMinutes) {
        const h = Math.floor(current / 60)
        const m = current % 60
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

        const exists = slots.some(s => s.date === dateStr && s.time === time)
        if (!exists) {
          newSlots.push({
            id: crypto.randomUUID(),
            date: dateStr,
            time,
            duration: config.duration,
            lecturerName: config.lecturerName,
            classGroup: config.classGroup,
          })
        }

        current += config.duration
      }
    }

    const savedConfig: SlotConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    setSlots(prev => [...prev, ...newSlots])
    setSlotConfigs(prev => [savedConfig, ...prev])
    return newSlots
  }, [slots])

  const removeSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id))
    setBookings(prev => prev.map(b => b.slotId === id ? { ...b, status: 'cancelled' as const } : b))
  }, [])

  const clearAllSlots = useCallback(() => {
    setSlots([])
    setSlotConfigs([])
    setBookings(prev => prev.map(b => ({ ...b, status: 'cancelled' as const })))
  }, [])

  const getAvailableDates = useCallback((): string[] => {
    const dates = new Set<string>()
    for (const slot of slots) {
      if (!bookedSlotIds.has(slot.id)) {
        dates.add(slot.date)
      }
    }
    return Array.from(dates).sort()
  }, [slots, bookedSlotIds])

  const getAvailableSlots = useCallback((date: string): PresentationSlot[] => {
    return slots
      .filter(s => s.date === date && !bookedSlotIds.has(s.id))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [slots, bookedSlotIds])

  const bookSlot = useCallback((slotId: string, data: { studentName: string; studentEmail: string; presentationTopic: string; notes: string }): Booking => {
    const slot = slots.find(s => s.id === slotId)
    if (!slot) throw new Error('Slot not found')

    const booking: Booking = {
      id: crypto.randomUUID(),
      slotId,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      ...data,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }

    setBookings(prev => [booking, ...prev])
    return booking
  }, [slots])

  const getStudentBookings = useCallback((email: string): Booking[] => {
    return bookings.filter(b => b.studentEmail.toLowerCase() === email.toLowerCase())
  }, [bookings])

  const cancelBooking = useCallback((id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b))
  }, [])

  const getBookingsForDateRange = useCallback((start: string, end: string): Booking[] => {
    return bookings.filter(b => b.date >= start && b.date <= end)
  }, [bookings])

  const exportBookingsCSV = useCallback(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed')
    if (confirmed.length === 0) return

    const headers = ['Student Name', 'Email', 'Presentation Topic', 'Date', 'Time', 'Duration (min)', 'Notes', 'Booked At']
    const rows = confirmed.map(b => [
      b.studentName,
      b.studentEmail,
      b.presentationTopic,
      b.date,
      b.time,
      b.duration.toString(),
      b.notes.replace(/,/g, ';'),
      b.createdAt,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [bookings])

  const updateAdminSettings = useCallback((updates: Partial<AdminSettings>) => {
    setAdminSettings(prev => ({ ...prev, ...updates }))
  }, [])

  return (
    <BookingContext.Provider value={{
      slots, bookings, slotConfigs, adminSettings,
      generateSlots, removeSlot, clearAllSlots,
      getAvailableDates, getAvailableSlots, bookSlot, getStudentBookings, cancelBooking,
      getBookingsForDateRange, exportBookingsCSV, updateAdminSettings,
    }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBookings() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBookings must be used within BookingProvider')
  return ctx
}
