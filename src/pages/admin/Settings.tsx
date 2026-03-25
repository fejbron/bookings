import { useState } from 'react'
import { Settings as SettingsIcon, Key, MessageSquare, Check, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBookings } from '../../context/BookingContext'

export default function Settings() {
  const { changePin } = useAuth()
  const { adminSettings, updateAdminSettings } = useBookings()

  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [welcomeMsg, setWelcomeMsg] = useState(adminSettings.welcomeMessage)
  const [savedWelcome, setSavedWelcome] = useState(false)

  function handlePinChange(e: React.FormEvent) {
    e.preventDefault()
    setPinMsg(null)
    if (newPin !== confirmPin) return setPinMsg({ type: 'error', text: 'New PINs do not match.' })
    if (newPin.length < 4) return setPinMsg({ type: 'error', text: 'PIN must be at least 4 characters.' })
    const ok = changePin(currentPin, newPin)
    if (ok) {
      setPinMsg({ type: 'success', text: 'PIN changed successfully!' })
      setCurrentPin(''); setNewPin(''); setConfirmPin('')
    } else {
      setPinMsg({ type: 'error', text: 'Current PIN is incorrect.' })
    }
  }

  function handleSaveWelcome() {
    updateAdminSettings({ welcomeMessage: welcomeMsg.trim() })
    setSavedWelcome(true)
    setTimeout(() => setSavedWelcome(false), 3000)
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
  const labelCls = "block text-xs font-medium text-[var(--text-secondary)] mb-1.5"

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-[var(--accent)]" />
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your admin preferences and booking policies.</p>
        </div>

        <div className="space-y-5">
          {/* Change PIN */}
          <form onSubmit={handlePinChange} className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '40ms' }}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-[var(--accent)]" /> Change Admin PIN
            </h2>
            <div className="space-y-3 max-w-sm">
              <div>
                <label className={labelCls}>Current PIN</label>
                <input type="password" value={currentPin} onChange={e => setCurrentPin(e.target.value)} placeholder="Enter current PIN" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>New PIN</label>
                <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="At least 4 characters" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Confirm New PIN</label>
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Re-enter new PIN" className={inputCls} />
              </div>
            </div>
            {pinMsg && (
              <div className={`mt-4 flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${pinMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {pinMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {pinMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={!currentPin || !newPin || !confirmPin}
              className="mt-4 flex items-center gap-2 bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Update PIN
            </button>
          </form>

          {/* Welcome Message */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--accent)]" /> Welcome Message
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">Shown on the student home page. Leave blank to hide.</p>
            <textarea
              value={welcomeMsg}
              onChange={e => setWelcomeMsg(e.target.value)}
              rows={3}
              placeholder="e.g. Book your final year presentation slots for Spring 2026!"
              className={`${inputCls} resize-none`}
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleSaveWelcome}
                className="bg-[var(--accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Save Message
              </button>
              {savedWelcome && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> Saved!
                </span>
              )}
            </div>
          </div>

          {/* Policies */}
          <div className="bg-white rounded-xl border border-[var(--border)] p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[var(--accent)]" /> Booking Policies
            </h2>
            <div className="flex items-center justify-between py-3 border-t border-[var(--border)]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Allow students to cancel bookings</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">When disabled, only admins can cancel.</p>
              </div>
              <button
                onClick={() => updateAdminSettings({ allowSelfCancel: !adminSettings.allowSelfCancel })}
                className={`transition-colors ${adminSettings.allowSelfCancel ? 'text-[var(--accent)]' : 'text-gray-300'}`}
              >
                {adminSettings.allowSelfCancel ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
