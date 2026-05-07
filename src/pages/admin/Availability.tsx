import { useState } from 'react'
import { Clock, Check, Calendar, Info } from 'lucide-react'
import { useBookings } from '../../context/BookingContext'
import ManageSlots from './ManageSlots'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

const NOTICE_OPTIONS = [
  { value: 0, label: 'No minimum' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '1 day' },
  { value: 2880, label: '2 days' },
]

const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
]

interface DaySchedule {
  enabled: boolean
  start: string
  end: string
}

type WeekSchedule = Record<string, DaySchedule>

const defaultSchedule: WeekSchedule = {
  mon: { enabled: true, start: '09:00', end: '17:00' },
  tue: { enabled: true, start: '09:00', end: '17:00' },
  wed: { enabled: true, start: '09:00', end: '17:00' },
  thu: { enabled: true, start: '09:00', end: '17:00' },
  fri: { enabled: true, start: '09:00', end: '17:00' },
  sat: { enabled: false, start: '09:00', end: '17:00' },
  sun: { enabled: false, start: '09:00', end: '17:00' },
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

type Tab = 'schedule' | 'slots'

export default function Availability() {
  const { adminSettings, updateAdminSettings } = useBookings()
  const [activeTab, setActiveTab] = useState<Tab>('schedule')
  const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule)
  const [noticeMinutes, setNoticeMinutes] = useState(0)
  const [bufferBefore, setBufferBefore] = useState(0)
  const [bufferAfter, setBufferAfter] = useState(0)
  const [saved, setSaved] = useState(false)

  function updateDay(key: string, patch: Partial<DaySchedule>) {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  async function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'schedule', label: 'Weekly Schedule' },
    { key: 'slots', label: 'Manage Slots' },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Availability</h1>
          <p className="mt-0.5 text-sm text-gray-500">Set when you're available and generate booking slots.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'schedule' && (
          <div className="space-y-4">
            {/* Weekly schedule */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar style={{ width: 15, height: 15 }} className="text-gray-500" />
                  Weekly Hours
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Set your default available hours for each day of the week.</p>
              </div>

              <div className="divide-y divide-gray-50">
                {DAYS.map(day => {
                  const d = schedule[day.key]
                  return (
                    <div key={day.key} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-24 flex items-center gap-2.5">
                        <Toggle checked={d.enabled} onChange={v => updateDay(day.key, { enabled: v })} />
                        <span className={`text-sm font-medium ${d.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                          {day.label.slice(0, 3)}
                        </span>
                      </div>

                      {d.enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={d.start}
                            onChange={e => updateDay(day.key, { start: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                          <span className="text-gray-400 text-sm">–</span>
                          <input
                            type="time"
                            value={d.end}
                            onChange={e => updateDay(day.key, { end: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unavailable</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Booking constraints */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock style={{ width: 15, height: 15 }} className="text-gray-500" />
                  Booking Constraints
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Control how and when students can book with you.
                </p>
              </div>

              <div className="divide-y divide-gray-50">
                {/* Minimum notice */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Minimum notice</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      How much notice you need before someone can book.
                    </p>
                  </div>
                  <select
                    value={noticeMinutes}
                    onChange={e => setNoticeMinutes(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {NOTICE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Buffer before */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Buffer before meeting</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Preparation time before each booking.
                    </p>
                  </div>
                  <select
                    value={bufferBefore}
                    onChange={e => setBufferBefore(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {BUFFER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Buffer after */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Buffer after meeting</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Recovery time after each booking ends.
                    </p>
                  </div>
                  <select
                    value={bufferAfter}
                    onChange={e => setBufferAfter(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    {BUFFER_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Self-cancel toggle */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Allow attendees to cancel</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When enabled, students can cancel their own bookings.
                    </p>
                  </div>
                  <Toggle
                    checked={adminSettings.allowSelfCancel}
                    onChange={v => void updateAdminSettings({ allowSelfCancel: v })}
                  />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                  <Check style={{ width: 14, height: 14 }} />
                  Saved!
                </span>
              )}
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Save schedule
              </button>
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <Info style={{ width: 14, height: 14 }} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                The weekly schedule is a reference guide. To actually create bookable time slots, go to the{' '}
                <button
                  onClick={() => setActiveTab('slots')}
                  className="font-semibold underline"
                >
                  Manage Slots
                </button>{' '}
                tab to generate slots based on your schedule.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'slots' && <ManageSlots embedded />}
      </div>
    </div>
  )
}
