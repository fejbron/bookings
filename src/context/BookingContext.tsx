import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { eachDayOfInterval, parseISO, format } from 'date-fns'
import type { PresentationSlot, SlotConfig, Booking, CalendarTypeRecord } from '../types'
import { supabase } from '../lib/supabase'
import { sendBookingConfirmationEmail } from '../lib/email'
import { useAuth } from './AuthContext'

export interface UserSettings {
  welcomeMessage: string
  allowSelfCancel: boolean
}

const DEFAULT_SETTINGS: UserSettings = { welcomeMessage: '', allowSelfCancel: true }

interface BookingContextType {
  slots: PresentationSlot[]
  bookings: Booking[]
  slotConfigs: SlotConfig[]
  calendarTypeRecords: CalendarTypeRecord[]
  userSettings: UserSettings
  loading: boolean
  userId: string | null

  generateSlots: (config: Omit<SlotConfig, 'id' | 'createdAt' | 'userId'> & { breakBetween?: number }) => Promise<PresentationSlot[]>
  removeSlot: (id: string) => Promise<void>
  clearAllSlots: () => Promise<void>

  addCalendarType: (name: string, color: string, description?: string) => Promise<CalendarTypeRecord>
  deleteCalendarType: (id: string) => Promise<void>

  getAvailableDates: (calendarType?: string) => string[]
  getAvailableSlots: (date: string, calendarType?: string) => PresentationSlot[]

  confirmBooking: (id: string) => Promise<void>
  cancelBooking: (id: string, reason?: string) => Promise<void>
  rescheduleBooking: (bookingId: string, newSlotId: string) => Promise<void>
  addAdminComment: (bookingId: string, comment: string) => Promise<void>
  exportBookingsCSV: () => void

  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>
}

const BookingContext = createContext<BookingContextType | null>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSlot(r: any): PresentationSlot {
  return { id: r.id, userId: r.user_id ?? undefined, date: r.date, time: r.time, duration: r.duration, calendarType: r.calendar_type ?? 'General', classGroup: r.class_group ?? undefined }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBooking(r: any): Booking {
  return { id: r.id, slotId: r.slot_id, hostUserId: r.host_user_id ?? undefined, date: r.date, time: r.time, duration: r.duration, studentName: r.student_name, studentEmail: r.student_email, presentationTopic: r.presentation_topic, notes: r.notes, status: r.status, adminComment: r.admin_comment ?? '', cancellationReason: r.cancellation_reason ?? '', createdAt: r.created_at }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toConfig(r: any): SlotConfig {
  return { id: r.id, userId: r.user_id ?? undefined, startDate: r.start_date, endDate: r.end_date, startTime: r.start_time, endTime: r.end_time, duration: r.duration, breakBetween: r.break_between ?? 0, excludeWeekends: r.exclude_weekends, calendarType: r.calendar_type ?? 'General', classGroup: r.class_group ?? undefined, createdAt: r.created_at }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCalendarType(r: any): CalendarTypeRecord {
  return { id: r.id, userId: r.user_id ?? undefined, name: r.name, color: r.color ?? 'blue', description: r.description ?? undefined, createdAt: r.created_at }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const { activeUserId, loading: authLoading } = useAuth()
  const userId = activeUserId
  const [slots, setSlots] = useState<PresentationSlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>([])
  const [calendarTypeRecords, setCalendarTypeRecords] = useState<CalendarTypeRecord[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return // wait for auth to resolve

    if (userId === null) {
      setSlots([])
      setBookings([])
      setSlotConfigs([])
      setCalendarTypeRecords([])
      setUserSettings(DEFAULT_SETTINGS)
      setLoading(false)
      return
    }

    setLoading(true)
    async function load() {
      const [slotsRes, configsRes, calTypesRes, settingsRes] = await Promise.all([
        supabase.from('slots').select('*').eq('user_id', userId).order('date').order('time'),
        supabase.from('slot_configs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('calendar_types').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('admin_settings').select('*').eq('user_id', userId).maybeSingle(),
      ])

      const mySlots = (slotsRes.data ?? []).map(toSlot)
      setSlots(mySlots)
      setSlotConfigs((configsRes.data ?? []).map(toConfig))
      setCalendarTypeRecords((calTypesRes.data ?? []).map(toCalendarType))

      if (settingsRes.data) {
        setUserSettings({
          welcomeMessage: settingsRes.data.welcome_message ?? '',
          allowSelfCancel: settingsRes.data.allow_self_cancel ?? true,
        })
      }

      // Load bookings for these slots
      if (mySlots.length > 0) {
        const slotIds = mySlots.map(s => s.id)
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('*')
          .in('slot_id', slotIds)
          .order('created_at', { ascending: false })
        setBookings((bookingData ?? []).map(toBooking))
      } else {
        setBookings([])
      }

      setLoading(false)
    }
    load()
  }, [userId, authLoading])

  const bookedSlotIds = new Set(
    bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').map(b => b.slotId)
  )

  const getAvailableDates = useCallback((calendarType?: string): string[] => {
    const today = new Date().toISOString().slice(0, 10)
    const dates = new Set<string>()
    for (const slot of slots) {
      if (!bookedSlotIds.has(slot.id) && slot.date >= today) {
        if (!calendarType || slot.calendarType === calendarType) dates.add(slot.date)
      }
    }
    return Array.from(dates).sort()
  }, [slots, bookedSlotIds])

  const getAvailableSlots = useCallback((date: string, calendarType?: string): PresentationSlot[] => {
    return slots
      .filter(s => s.date === date && !bookedSlotIds.has(s.id) && (!calendarType || s.calendarType === calendarType))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [slots, bookedSlotIds])

  const generateSlots = useCallback(async (
    config: Omit<SlotConfig, 'id' | 'createdAt' | 'userId'> & { breakBetween?: number }
  ): Promise<PresentationSlot[]> => {
    if (!userId) throw new Error('Not authenticated')
    const days = eachDayOfInterval({ start: parseISO(config.startDate), end: parseISO(config.endDate) })
    const [startH, startM] = config.startTime.split(':').map(Number)
    const [endH, endM] = config.endTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    const breakBetween = config.breakBetween ?? 0
    const step = config.duration + breakBetween
    const calendarType = config.calendarType ?? 'General'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = []

    for (const day of days) {
      if (config.excludeWeekends && (day.getDay() === 0 || day.getDay() === 6)) continue
      const dateStr = format(day, 'yyyy-MM-dd')
      let current = startMinutes
      while (current + config.duration <= endMinutes) {
        const h = Math.floor(current / 60)
        const m = current % 60
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        if (!slots.some(s => s.date === dateStr && s.time === time && s.calendarType === calendarType)) {
          rows.push({ id: crypto.randomUUID(), date: dateStr, time, duration: config.duration, calendar_type: calendarType, class_group: config.classGroup ?? null, user_id: userId })
        }
        current += step
      }
    }

    if (rows.length === 0) return []

    const { data: slotData, error: slotErr } = await supabase.from('slots').insert(rows).select()
    if (slotErr) throw new Error(slotErr.message)

    await supabase.from('slot_configs').insert({
      id: crypto.randomUUID(),
      start_date: config.startDate,
      end_date: config.endDate,
      start_time: config.startTime,
      end_time: config.endTime,
      duration: config.duration,
      break_between: breakBetween,
      exclude_weekends: config.excludeWeekends,
      calendar_type: calendarType,
      class_group: config.classGroup ?? null,
      user_id: userId,
    })

    const inserted = slotData.map(toSlot)
    setSlots(prev => [...prev, ...inserted])
    return inserted
  }, [userId, slots])

  const removeSlot = useCallback(async (id: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('slot_id', id)
    await supabase.from('slots').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
    setBookings(prev => prev.map(b => b.slotId === id ? { ...b, status: 'cancelled' as const } : b))
  }, [])

  const clearAllSlots = useCallback(async () => {
    if (!userId) return
    const slotIds = slots.map(s => s.id)
    if (slotIds.length > 0) {
      await supabase.from('bookings').update({ status: 'cancelled' }).in('slot_id', slotIds)
    }
    await supabase.from('slots').delete().eq('user_id', userId)
    await supabase.from('slot_configs').delete().eq('user_id', userId)
    setSlots([])
    setSlotConfigs([])
    setBookings(prev => prev.map(b => ({ ...b, status: 'cancelled' as const })))
  }, [userId, slots])

  const addCalendarType = useCallback(async (name: string, color: string, description?: string): Promise<CalendarTypeRecord> => {
    if (!userId) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('calendar_types')
      .insert({ id: crypto.randomUUID(), name, color, description: description?.trim() || null, user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    const record = toCalendarType(data)
    setCalendarTypeRecords(prev => [...prev, record])
    return record
  }, [userId])

  const deleteCalendarType = useCallback(async (id: string) => {
    const { error } = await supabase.from('calendar_types').delete().eq('id', id)
    if (error) throw new Error(error.message)
    setCalendarTypeRecords(prev => prev.filter(t => t.id !== id))
  }, [])

  const confirmBooking = useCallback(async (id: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
    setBookings(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, status: 'confirmed' as const } : b)
      const booking = updated.find(b => b.id === id)
      if (booking) {
        const slot = slots.find(s => s.id === booking.slotId)
        sendBookingConfirmationEmail({
          studentName: booking.studentName,
          studentEmail: booking.studentEmail,
          date: booking.date,
          time: booking.time,
          duration: booking.duration,
          calendarType: slot?.calendarType ?? '',
          presentationTopic: booking.presentationTopic,
        }).catch(() => {})
      }
      return updated
    })
  }, [slots])

  const cancelBooking = useCallback(async (id: string, reason?: string) => {
    await supabase.from('bookings').update({ status: 'cancelled', cancellation_reason: reason?.trim() || null }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as const, cancellationReason: reason?.trim() ?? '' } : b))
  }, [])

  const rescheduleBooking = useCallback(async (bookingId: string, newSlotId: string) => {
    const newSlot = slots.find(s => s.id === newSlotId)
    if (!newSlot) throw new Error('Slot not found')
    const { error } = await supabase
      .from('bookings')
      .update({ slot_id: newSlotId, date: newSlot.date, time: newSlot.time, duration: newSlot.duration })
      .eq('id', bookingId)
    if (error) throw new Error(error.message)
    setBookings(prev => prev.map(b => b.id === bookingId
      ? { ...b, slotId: newSlotId, date: newSlot.date, time: newSlot.time, duration: newSlot.duration }
      : b
    ))
  }, [slots])

  const addAdminComment = useCallback(async (bookingId: string, comment: string) => {
    const { error } = await supabase.from('bookings').update({ admin_comment: comment }).eq('id', bookingId)
    if (error) throw new Error(error.message)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, adminComment: comment } : b))
  }, [])

  const exportBookingsCSV = useCallback(() => {
    const confirmed = bookings.filter(b => b.status === 'confirmed')
    if (confirmed.length === 0) return
    const headers = ['Name', 'Email', 'Topic', 'Date', 'Time', 'Duration (min)', 'Notes', 'Comment', 'Booked At']
    const rows = confirmed.map(b => [
      b.studentName, b.studentEmail, b.presentationTopic, b.date, b.time,
      b.duration.toString(), b.notes.replace(/,/g, ';'), (b.adminComment ?? '').replace(/,/g, ';'), b.createdAt,
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

  const updateUserSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!userId) return
    const next = { ...userSettings, ...updates }
    await supabase
      .from('admin_settings')
      .upsert(
        { user_id: userId, welcome_message: next.welcomeMessage, allow_self_cancel: next.allowSelfCancel },
        { onConflict: 'user_id' }
      )
    setUserSettings(next)
  }, [userId, userSettings])

  return (
    <BookingContext.Provider value={{
      slots, bookings, slotConfigs, calendarTypeRecords, userSettings, loading, userId: userId ?? null,
      generateSlots, removeSlot, clearAllSlots,
      addCalendarType, deleteCalendarType,
      getAvailableDates, getAvailableSlots,
      confirmBooking, cancelBooking, rescheduleBooking, addAdminComment, exportBookingsCSV,
      updateUserSettings,
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
