import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Check, Clock, CalendarDays, Mail, User, AlertCircle,
  ChevronLeft, Globe, Zap, Plus, Trash2, GraduationCap,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Calendar from '../components/Calendar'
import TimeSlots, { formatTime } from '../components/TimeSlots'
import type { LecturerProfile, PresentationSlot, CalendarTypeRecord, Booking, BookingStudent } from '../types'

const COLOR_BG: Record<string, string> = {
  blue: '#006BFF', purple: '#7C3AED', green: '#059669',
  orange: '#EA580C', pink: '#DB2777', teal: '#0891B2', grey: '#4B5563',
}

type View = 'type' | 'select' | 'confirm'

interface PageData {
  profile: LecturerProfile
  slots: PresentationSlot[]
  calendarTypes: CalendarTypeRecord[]
  bookings: Booking[]
  welcomeMessage: string
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-16 h-16 rounded-full bg-zinc-700 text-white flex items-center justify-center text-xl font-bold">
      {initials}
    </div>
  )
}

export default function UserPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()

  const [pageData, setPageData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    async function load() {
      const { data: profileRow } = await supabase
        .from('lecturer_profiles')
        .select('*')
        .eq('username', username)
        .eq('is_public', true)
        .maybeSingle()

      if (!profileRow) { setNotFound(true); setLoading(false); return }

      const profile: LecturerProfile = {
        id: profileRow.id,
        userId: profileRow.user_id ?? undefined,
        username: profileRow.username ?? undefined,
        name: profileRow.name,
        email: profileRow.email,
        title: profileRow.title ?? undefined,
        classGroup: profileRow.class_group ?? undefined,
        description: profileRow.description ?? undefined,
        isPublic: profileRow.is_public ?? true,
        createdAt: profileRow.created_at,
      }

      const today = new Date().toISOString().slice(0, 10)
      const [slotsRes, calTypesRes, settingsRes] = await Promise.all([
        supabase.from('slots').select('*').eq('user_id', profileRow.user_id).gte('date', today).order('date').order('time'),
        supabase.from('calendar_types').select('*').eq('user_id', profileRow.user_id).order('created_at'),
        supabase.from('admin_settings').select('welcome_message').eq('user_id', profileRow.user_id).maybeSingle(),
      ])

      const slots: PresentationSlot[] = (slotsRes.data ?? []).map((r) => ({
        id: r.id, userId: r.user_id ?? undefined, date: r.date, time: r.time,
        duration: r.duration, calendarType: r.calendar_type ?? 'General', classGroup: r.class_group ?? undefined,
      }))

      const slotIds = slots.map(s => s.id)
      let bookings: Booking[] = []
      if (slotIds.length > 0) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id, slot_id, status')
          .in('slot_id', slotIds)
          .in('status', ['confirmed', 'pending'])
        bookings = (bookingData ?? []).map((r) => ({
          id: r.id, slotId: r.slot_id, date: '', time: '', duration: 0,
          studentName: '', studentEmail: '', presentationTopic: '', notes: '',
          status: r.status, adminComment: '', cancellationReason: '', students: [], createdAt: '',
        }))
      }

      setPageData({
        profile,
        slots,
        calendarTypes: (calTypesRes.data ?? []).map((r) => ({
          id: r.id, userId: r.user_id ?? undefined, name: r.name, color: r.color ?? 'blue',
          description: r.description ?? undefined, isPresentation: r.is_presentation ?? false, createdAt: r.created_at,
        })),
        bookings,
        welcomeMessage: settingsRes.data?.welcome_message ?? '',
      })
      setLoading(false)
    }
    load()
  }, [username])

  // Booking state
  const [view, setView] = useState<View>('type')
  const [calendarType, setCalendarType] = useState<string | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [students, setStudents] = useState<BookingStudent[]>([{ name: '', indexNumber: '' }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const bookedSlotIds = useMemo(
    () => new Set(pageData?.bookings.map(b => b.slotId) ?? []),
    [pageData]
  )

  const availableSlots = useMemo(
    () => (pageData?.slots ?? []).filter(s => !bookedSlotIds.has(s.id)),
    [pageData, bookedSlotIds]
  )

  const calendarTypes = useMemo(() => {
    const names = new Set(availableSlots.map(s => s.calendarType))
    return (pageData?.calendarTypes ?? []).filter(t => names.has(t.name))
  }, [pageData, availableSlots])

  const availableDates = useMemo(() => {
    const dates = new Set<string>()
    for (const s of availableSlots) {
      if (!calendarType || s.calendarType === calendarType) dates.add(s.date)
    }
    return Array.from(dates).sort()
  }, [availableSlots, calendarType])

  const slotsForDate = useMemo(() => {
    if (!date) return []
    const dateStr = format(date, 'yyyy-MM-dd')
    return availableSlots
      .filter(s => s.date === dateStr && (!calendarType || s.calendarType === calendarType))
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [date, availableSlots, calendarType])

  const selectedSlot = useMemo(() => slotsForDate.find(s => s.id === slotId) ?? null, [slotsForDate, slotId])

  function handleSelectType(type: string) {
    setCalendarType(type)
    setDate(null)
    setSlotId(null)
    setView('select')
  }

  function handleDateSelect(d: Date) {
    setDate(d)
    setSlotId(null)
  }

  const isTopicHidden = ['Office Meeting', 'Other', 'Personal'].includes(calendarType ?? '')
  const selectedType = pageData?.calendarTypes.find(t => t.name === calendarType)
  const isPresentation = selectedType?.isPresentation ?? false

  function addStudent() {
    setStudents(prev => [...prev, { name: '', indexNumber: '' }])
  }
  function removeStudent(i: number) {
    setStudents(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateStudent(i: number, field: keyof BookingStudent, value: string) {
    setStudents(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Full name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email.'
    if (!isTopicHidden && !topic.trim()) e.topic = 'Topic is required.'
    if (isPresentation) {
      const valid = students.some(s => s.name.trim() && s.indexNumber.trim())
      if (!valid) e.students = 'Add at least one student with a name and index number.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleConfirm() {
    if (!slotId || !validate() || !pageData) return
    setSubmitting(true)
    setBookingError('')
    try {
      const slot = pageData.slots.find(s => s.id === slotId)!

      const { data: taken } = await supabase
        .from('bookings')
        .select('id')
        .eq('slot_id', slotId)
        .in('status', ['confirmed', 'pending'])
        .maybeSingle()
      if (taken) throw new Error('This slot was just taken. Please pick another time.')

      const validStudents = isPresentation
        ? students.filter(s => s.name.trim() && s.indexNumber.trim()).map(s => ({ name: s.name.trim(), indexNumber: s.indexNumber.trim(), score: null }))
        : []

      const { error } = await supabase.from('bookings').insert({
        id: crypto.randomUUID(),
        slot_id: slotId,
        host_user_id: pageData.profile.userId ?? null,
        date: slot.date,
        time: slot.time,
        duration: slot.duration,
        student_name: name.trim(),
        student_email: email.trim().toLowerCase(),
        presentation_topic: isTopicHidden ? (calendarType ?? 'Meeting') : topic.trim(),
        notes: notes.trim(),
        status: 'pending',
        students: validStudents,
      })
      if (error) throw new Error(error.message)
      setSubmitted(true)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
    setView(calendarTypes.length > 1 ? 'type' : 'select')
    setCalendarType(calendarTypes.length <= 1 ? (calendarTypes[0]?.name ?? null) : null)
    setDate(null); setSlotId(null)
    setName(''); setEmail(''); setTopic(''); setNotes('')
    setStudents([{ name: '', indexNumber: '' }])
    setErrors({}); setBookingError(''); setSubmitted(false)
  }

  // ── Loading / not found ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !pageData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-bold text-white">Page not found</h1>
        <p className="mt-2 text-zinc-400 text-sm">No booking page exists at this address.</p>
        <Link to="/" className="mt-6 text-sm text-zinc-400 hover:text-white transition-colors">← Back to directory</Link>
      </div>
    )
  }

  const { profile, welcomeMessage } = pageData

  // ── Success ──────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-10 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-emerald-950/40 border border-emerald-900/40">
            <Check style={{ width: 28, height: 28, color: '#34D399' }} />
          </div>
          <h2 className="text-xl font-bold text-white">Request sent!</h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Your booking request with <span className="font-semibold text-white">{profile.name}</span> on{' '}
            <span className="font-semibold text-white">{date && format(date, 'EEEE, MMMM d')}</span>{' '}
            at <span className="font-semibold text-white">{selectedSlot && formatTime(selectedSlot.time)}</span> has been sent.
          </p>
          <div className="mt-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <CalendarDays style={{ width: 13, height: 13 }} />
              {date && format(date, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Clock style={{ width: 13, height: 13 }} />
              {selectedSlot && formatTime(selectedSlot.time)} · {selectedSlot?.duration} min
            </div>
          </div>
          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              View my bookings
            </button>
            <button
              onClick={resetAll}
              className="w-full text-zinc-300 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              Book another slot
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Type selection (shown when >1 event type, or as first step) ──────────────
  if (view === 'type') {
    return (
      <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-8 py-10 sm:py-16">
        <div className="w-full max-w-md space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <Avatar name={profile.name} />
            <h1 className="text-lg font-bold text-white mt-4">{profile.name}</h1>
            {profile.title && <p className="text-sm text-zinc-500 mt-0.5">{profile.title}</p>}
            {(welcomeMessage || profile.description) && (
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{welcomeMessage || profile.description}</p>
            )}
          </div>

          {calendarTypes.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-start gap-2 text-sm text-amber-400">
              <AlertCircle style={{ width: 16, height: 16 }} className="flex-shrink-0 mt-0.5" />
              No booking types available yet. Check back later.
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800 overflow-hidden">
              {calendarTypes.map(type => {
                const count = availableSlots.filter(s => s.calendarType === type.name).length
                const duration = availableSlots.find(s => s.calendarType === type.name)?.duration ?? 30
                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.name)}
                    disabled={count === 0}
                    className="w-full p-5 text-left hover:bg-zinc-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLOR_BG[type.color] ?? '#4B5563' }} />
                      <p className="text-base font-semibold text-white">{type.name}</p>
                    </div>
                    {type.description && (
                      <p className="text-sm text-zinc-500 mb-2 leading-relaxed line-clamp-2 ml-4">{type.description}</p>
                    )}
                    <div className="flex items-center gap-2 ml-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-zinc-800 rounded-md text-xs font-medium text-zinc-400">
                        <Clock style={{ width: 12, height: 12 }} />
                        {duration}m
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="text-center pt-2">
            <Link to="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← Back to directory
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Select date + time ───────────────────────────────────────────────────────
  const OrganizerPanel = (
    <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-800 md:w-64 flex-shrink-0">
      {calendarTypes.length > 1 && (
        <button
          onClick={() => setView('type')}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          All types
        </button>
      )}

      <div className="w-10 h-10 rounded-full bg-zinc-700 text-white flex items-center justify-center text-sm font-bold mb-3">
        {profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>

      <p className="text-xs text-zinc-500 mb-1">{profile.name}</p>

      {calendarType && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 bg-zinc-800 text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR_BG[pageData.calendarTypes.find(t => t.name === calendarType)?.color ?? 'grey'] ?? '#4B5563' }} />
          {calendarType}
        </div>
      )}

      <h2 className="text-base font-bold text-white leading-snug mb-4 mt-1">
        {welcomeMessage || 'Book a session'}
      </h2>

      <div className="space-y-2.5 text-sm text-zinc-400">
        {selectedSlot && (
          <div className="flex items-center gap-2">
            <Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span>{selectedSlot.duration} min</span>
          </div>
        )}
        {date && (
          <div className="flex items-center gap-2">
            <CalendarDays style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
          </div>
        )}
        {selectedSlot && (
          <div className="flex items-center gap-2">
            <Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" />
            <span className="font-semibold text-white">{formatTime(selectedSlot.time)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Globe style={{ width: 14, height: 14 }} className="flex-shrink-0" />
          <span className="text-xs">Africa/Accra</span>
        </div>
      </div>
    </div>
  )

  if (view === 'select') {
    return (
      <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row">
          {OrganizerPanel}
          <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-5">Select a date</h3>
            {availableDates.length === 0 ? (
              <div className="flex items-start gap-2 text-sm text-amber-400 bg-amber-950/30 border border-amber-900/40 px-4 py-3 rounded-xl">
                <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0 mt-0.5" />
                No slots available for this session type.
              </div>
            ) : (
              <Calendar selected={date} onSelect={handleDateSelect} availableDates={availableDates} dark />
            )}
          </div>
          <div className={`md:w-52 flex-shrink-0 transition-all duration-200 ${date ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {date && (
              <div className="p-6 md:p-8 flex flex-col h-full">
                <h3 className="text-sm font-semibold text-white mb-0.5">{format(date, 'EEEE')}</h3>
                <p className="text-xs text-zinc-500 mb-5">{format(date, 'MMMM d, yyyy')}</p>
                <div className="flex-1 overflow-y-auto max-h-80">
                  <TimeSlots slots={slotsForDate} selected={slotId} onSelect={setSlotId} dark />
                </div>
                {slotId && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <button
                      onClick={() => setView('confirm')}
                      className="w-full bg-white text-black py-2.5 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
                    >
                      Confirm time →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Confirm ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-4 sm:p-6 py-8 sm:py-12">
      <div className="w-full max-w-3xl bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col md:flex-row">
        <div className="md:w-64 flex-shrink-0 p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-800">
          <button
            onClick={() => setView('select')}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-5 transition-colors"
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
            Back
          </button>
          <div className="w-10 h-10 rounded-full bg-zinc-700 text-white flex items-center justify-center text-sm font-bold mb-3">
            {profile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <p className="text-xs text-zinc-500 mb-2">{profile.name}</p>
          {calendarType && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2 bg-zinc-800 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR_BG[pageData.calendarTypes.find(t => t.name === calendarType)?.color ?? 'grey'] ?? '#4B5563' }} />
              {calendarType}
            </div>
          )}
          <h2 className="text-base font-bold text-white mb-4 mt-1">{welcomeMessage || 'Book a session'}</h2>
          <div className="space-y-2.5 text-sm text-zinc-400">
            <div className="flex items-center gap-2"><Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" /><span>{selectedSlot?.duration} min</span></div>
            <div className="flex items-center gap-2"><CalendarDays style={{ width: 14, height: 14 }} className="flex-shrink-0" /><span>{date && format(date, 'EEEE, MMMM d, yyyy')}</span></div>
            <div className="flex items-center gap-2"><Clock style={{ width: 14, height: 14 }} className="flex-shrink-0" /><span className="font-semibold text-white">{selectedSlot && formatTime(selectedSlot.time)}</span></div>
            <div className="flex items-center gap-2 pt-1"><Globe style={{ width: 14, height: 14 }} className="flex-shrink-0" /><span className="text-xs">Africa/Accra</span></div>
          </div>
        </div>

        <div className="flex-1 p-6 md:p-8">
          <h2 className="text-[15px] font-semibold text-white mb-5">Enter your details</h2>
          <div className="space-y-4">
            {[
              { icon: User, label: 'Full name', key: 'name', type: 'text', val: name, set: setName, placeholder: 'Your full name', err: errors.name },
              { icon: Mail, label: 'Email address', key: 'email', type: 'email', val: email, set: setEmail, placeholder: 'you@example.com', err: errors.email },
              ...(!isTopicHidden ? [{ icon: Zap, label: 'Topic / purpose', key: 'topic', type: 'text', val: topic, set: setTopic, placeholder: 'e.g. Final Year Project Review', err: errors.topic }] : []),
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => { f.set(e.target.value); setErrors(prev => ({ ...prev, [f.key]: '' })) }}
                  placeholder={f.placeholder}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition bg-zinc-950 ${f.err ? 'border-red-700 bg-red-950/30' : 'border-zinc-800'}`}
                />
                {f.err && <p className="mt-1 text-xs text-red-400">{f.err}</p>}
              </div>
            ))}

            {!isTopicHidden && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Additional notes <span className="font-normal text-zinc-600">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything else to share?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition resize-none"
                />
              </div>
            )}

            {isPresentation && (
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap style={{ width: 14, height: 14 }} className="text-zinc-400" />
                    <label className="text-xs font-semibold text-zinc-400">Group members</label>
                  </div>
                  <button
                    type="button"
                    onClick={addStudent}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus style={{ width: 13, height: 13 }} /> Add student
                  </button>
                </div>
                <div className="space-y-2">
                  {students.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.name}
                        onChange={e => { updateStudent(i, 'name', e.target.value); setErrors(prev => ({ ...prev, students: '' })) }}
                        placeholder="Full name"
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white transition"
                      />
                      <input
                        type="text"
                        value={s.indexNumber}
                        onChange={e => { updateStudent(i, 'indexNumber', e.target.value); setErrors(prev => ({ ...prev, students: '' })) }}
                        placeholder="Index no."
                        className="w-28 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white transition"
                      />
                      {students.length > 1 && (
                        <button type="button" onClick={() => removeStudent(i)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.students && <p className="mt-1.5 text-xs text-red-400">{errors.students}</p>}
              </div>
            )}
          </div>

          {bookingError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-900/40 px-4 py-3 rounded-xl">
              <AlertCircle style={{ width: 15, height: 15 }} className="flex-shrink-0" />
              {bookingError}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Confirming…' : 'Confirm booking'}
            </button>
            <p className="text-xs text-zinc-600 text-center mt-3">
              Your request will be reviewed before confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
