import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import type { PresentationSlot, SlotConfig, Booking } from '../types'
import { supabase } from '../lib/supabase'

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
  loading: boolean

  generateSlots: (config: Omit<SlotConfig, 'id' | 'createdAt'>) => Promise<PresentationSlot[]>
  removeSlot: (id: string) => Promise<void>
  clearAllSlots: () => Promise<void>

  getAvailableDates: () => string[]
  getAvailableSlots: (date: string) => PresentationSlot[]
  bookSlot: (slotId: string, data: { studentName: string; studentEmail: string; presentationTopic: string; notes: string }) => Promise<Booking>
  getStudentBookings: (email: string) => Booking[]
  cancelBooking: (id: string) => Promise<void>

  rescheduleBooking: (bookingId: string, newSlotId: string) => Promise<void>
  addAdminComment: (bookingId: string, comment: string) => Promise<void>

  getBookingsForDateRange: (start: string, end: string) => Booking[]
  exportBookingsCSV: () => void
  updateAdminSettings: (settings: Partial<AdminSettings>) => Promise<void>
}

const BookingContext = createContext<BookingContextType | null>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSlot(r: any): PresentationSlot {
  return { id: r.id, date: r.date, time: r.time, duration: r.duration, lecturerName: r.lecturer_name ?? undefined, classGroup: r.class_group ?? undefined }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBooking(r: any): Booking {
  return { id: r.id, slotId: r.slot_id, date: r.date, time: r.time, duration: r.duration, studentName: r.student_name, studentEmail: r.student_email, presentationTopic: r.presentation_topic, notes: r.notes, status: r.status, adminComment: r.admin_comment ?? '', createdAt: r.created_at }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toConfig(r: any): SlotConfig {
  return { id: r.id, startDate: r.start_date, endDate: r.end_date, startTime: r.start_time, endTime: r.end_time, duration: r.duration, excludeWeekends: r.exclude_weekends, lecturerName: r.lecturer_name ?? undefined, classGroup: r.class_group ?? undefined, createdAt: r.created_at }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<PresentationSlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [slotsRes, bookingsRes, configsRes, settingsRes] = await Promise.all([
        supabase.from('slots').select('*').order('date').order('time'),
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('slot_configs').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_settings').select('*').eq('id', 1).single(),
      ])
      if (slotsRes.data) setSlots(slotsRes.data.map(toSlot))
      if (bookingsRes.data) setBookings(bookingsRes.data.map(toBooking))
      if (configsRes.data) setSlotConfigs(configsRes.data.map(toConfig))
      if (settingsRes.data) setAdminSettings({ welcomeMessage: settingsRes.data.welcome_message, allowSelfCancel: settingsRes.data.allow_self_cancel })
      setLoading(false)
    }
    load()
  }, [])

  const bookedSlotIds = new Set(bookings.filter(b => b.status === 'confirmed').map(b => b.slotId))

  const generateSlots = useCallback(async (config: Omit<SlotConfig, 'id' | 'createdAt'>): Promise<PresentationSlot[]> => {
    const days = eachDayOfInterval({ start: parseISO(config.startDate), end: parseISO(config.endDate) })
    const [startH, startM] = config.startTime.split(':').map(Number)
    const [endH, endM] = config.endTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    const rows: { id: string; date: string; time: string; duration: number; lecturer_name: string | null; class_group: string | null }[] = []

    for (const day of days) {
      if (config.excludeWeekends && (day.getDay() === 0 || day.getDay() === 6)) continue
      const dateStr = format(day, 'yyyy-MM-dd')
      let current = startMinutes
      while (current + config.duration <= endMinutes) {
        const h = Math.floor(current / 60)
        const m = current % 60
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        if (!slots.some(s => s.date === dateStr && s.time === time)) {
          rows.push({ id: crypto.randomUUID(), date: dateStr, time, duration: config.duration, lecturer_name: config.lecturerName ?? null, class_group: config.classGroup ?? null })
        }
        current += config.duration
      }
    }

    if (rows.length === 0) return []

    const { data: slotData, error: slotErr } = await supabase.from('slots').insert(rows).select()
    if (slotErr) throw slotErr

    const { data: configData } = await supabase.from('slot_configs').insert({
      id: crypto.randomUUID(),
      start_date: config.startDate,
      end_date: config.endDate,
      start_time: config.startTime,
      end_time: config.endTime,
      duration: config.duration,
      exclude_weekends: config.excludeWeekends,
      lecturer_name: config.lecturerName ?? null,
      class_group: config.classGroup ?? null,
    }).select().single()

    const inserted = slotData.map(toSlot)
    setSlots(prev => [...prev, ...inserted])
    if (configData) setSlotConfigs(prev => [toConfig(configData), ...prev])
    return inserted
  }, [slots])

  const removeSlot = useCallback(async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('slot_id', id)
    await supabase.from('slots').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
    setBookings(prev => prev.map(b => b.slotId === id ? { ...b, status: 'cancelled' as const } : b))
  }, [])

  const clearAllSlots = useCallback(async () => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('status', 'confirmed')
    await supabase.from('slots').delete().not('id', 'is', null)
    await supabase.from('slot_configs').delete().not('id', 'is', null)
    setSlots([])
    setSlotConfigs([])
    setBookings(prev => prev.map(b => ({ ...b, status: 'cancelled' as const })))
  }, [])

  const getAvailableDates = useCallback((): string[] => {
    const today = new Date().toISOString().slice(0, 10)
    const dates = new Set<string>()
    for (const slot of slots) {
      if (!bookedSlotIds.has(slot.id) && slot.date >= today) dates.add(slot.date)
    }
    return Array.from(dates).sort()
  }, [slots, bookedSlotIds])

  const getAvailableSlots = useCallback((date: string): PresentationSlot[] => {
    return slots.filter(s => s.date === date && !bookedSlotIds.has(s.id)).sort((a, b) => a.time.localeCompare(b.time))
  }, [slots, bookedSlotIds])

  const bookSlot = useCallback(async (slotId: string, data: { studentName: string; studentEmail: string; presentationTopic: string; notes: string }): Promise<Booking> => {
    const slot = slots.find(s => s.id === slotId)
    if (!slot) throw new Error('Slot not found')

    const { data: slotTaken } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_id', slotId)
      .eq('status', 'confirmed')
      .maybeSingle()
    if (slotTaken) throw new Error('This slot was just taken. Please choose another time.')

    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('student_email', data.studentEmail.toLowerCase())
      .eq('date', slot.date)
      .eq('status', 'confirmed')
      .maybeSingle()
    if (existing) throw new Error('You already have a booking on this date.')

    const { data: inserted, error } = await supabase.from('bookings').insert({
      id: crypto.randomUUID(),
      slot_id: slotId,
      date: slot.date,
      time: slot.time,
      duration: slot.duration,
      student_name: data.studentName,
      student_email: data.studentEmail.toLowerCase(),
      presentation_topic: data.presentationTopic,
      notes: data.notes,
      status: 'confirmed',
    }).select().single()
    if (error) throw error

    const booking = toBooking(inserted)
    setBookings(prev => [booking, ...prev])
    return booking
  }, [slots])

  const getStudentBookings = useCallback((email: string): Booking[] => {
    return bookings.filter(b => b.studentEmail.toLowerCase() === email.toLowerCase())
  }, [bookings])

  const cancelBooking = useCallback(async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const } : b))
  }, [])

  const rescheduleBooking = useCallback(async (bookingId: string, newSlotId: string) => {
    const newSlot = slots.find(s => s.id === newSlotId)
    if (!newSlot) throw new Error('Slot not found')

    const { data: slotTaken } = await supabase
      .from('bookings')
      .select('id')
      .eq('slot_id', newSlotId)
      .eq('status', 'confirmed')
      .maybeSingle()
    if (slotTaken) throw new Error('This slot is already taken. Please choose another time.')

    const { error } = await supabase
      .from('bookings')
      .update({ slot_id: newSlotId, date: newSlot.date, time: newSlot.time, duration: newSlot.duration })
      .eq('id', bookingId)
    if (error) throw error

    setBookings(prev => prev.map(b => b.id === bookingId
      ? { ...b, slotId: newSlotId, date: newSlot.date, time: newSlot.time, duration: newSlot.duration }
      : b
    ))
  }, [slots])

  const addAdminComment = useCallback(async (bookingId: string, comment: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ admin_comment: comment })
      .eq('id', bookingId)
    if (error) throw error
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, adminComment: comment } : b))
  }, [])

  const getBookingsForDateRange = useCallback((start: string, end: string): Booking[] => {
    return bookings.filter(b => b.date >= start && b.date <= end)
  }, [bookings])

  const exportBookingsCSV = useCallback(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed')
    if (confirmed.length === 0) return
    const headers = ['Student Name', 'Email', 'Presentation Topic', 'Date', 'Time', 'Duration (min)', 'Notes', 'Admin Comment', 'Booked At']
    const rows = confirmed.map(b => [b.studentName, b.studentEmail, b.presentationTopic, b.date, b.time, b.duration.toString(), b.notes.replace(/,/g, ';'), (b.adminComment ?? '').replace(/,/g, ';'), b.createdAt])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [bookings])

  const updateAdminSettings = useCallback(async (updates: Partial<AdminSettings>) => {
    const newSettings = { ...adminSettings, ...updates }
    await supabase.from('admin_settings').upsert({ id: 1, welcome_message: newSettings.welcomeMessage, allow_self_cancel: newSettings.allowSelfCancel })
    setAdminSettings(newSettings)
  }, [adminSettings])

  return (
    <BookingContext.Provider value={{
      slots, bookings, slotConfigs, adminSettings, loading,
      generateSlots, removeSlot, clearAllSlots,
      getAvailableDates, getAvailableSlots, bookSlot, getStudentBookings, cancelBooking,
      rescheduleBooking, addAdminComment,
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
