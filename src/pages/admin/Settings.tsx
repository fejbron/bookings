import { useState } from 'react'
import { Key, Check, AlertCircle, User, Shield, Globe, Mail, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBookings } from '../../context/BookingContext'
import { saveEmailConfig, clearEmailConfig, getEmailConfig, isEmailConfigured, sendBookingConfirmationEmail } from '../../lib/email'

type Tab = 'profile' | 'general' | 'email' | 'security'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

const inputCls = "w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"

export default function Settings() {
  const { changePassword, user } = useAuth()
  const { adminSettings, updateAdminSettings } = useBookings()

  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile
  const [orgName, setOrgName] = useState('BookSlot')
  const [timezone, setTimezone] = useState('Africa/Accra')
  const [welcomeMsg, setWelcomeMsg] = useState(adminSettings.welcomeMessage)
  const [savedProfile, setSavedProfile] = useState(false)

  // Email
  const savedCfg = getEmailConfig()
  const [emailServiceId, setEmailServiceId]   = useState(savedCfg.serviceId)
  const [emailTemplateId, setEmailTemplateId] = useState(savedCfg.templateId)
  const [emailPublicKey, setEmailPublicKey]   = useState(savedCfg.publicKey)
  const [showKey, setShowKey] = useState(false)
  const [emailConnected, setEmailConnected] = useState(isEmailConfigured())
  const [emailSaveMsg, setEmailSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testSending, setTestSending] = useState(false)

  async function handleSaveEmail() {
    if (!emailServiceId.trim() || !emailTemplateId.trim() || !emailPublicKey.trim()) {
      setEmailSaveMsg({ type: 'error', text: 'All three fields are required.' })
      return
    }
    saveEmailConfig(emailServiceId.trim(), emailTemplateId.trim(), emailPublicKey.trim())
    setEmailConnected(true)
    setEmailSaveMsg({ type: 'success', text: 'Email connected successfully.' })
    setTimeout(() => setEmailSaveMsg(null), 3000)
  }

  function handleDisconnectEmail() {
    clearEmailConfig()
    setEmailServiceId(''); setEmailTemplateId(''); setEmailPublicKey('')
    setEmailConnected(false)
    setEmailSaveMsg(null)
  }

  async function handleTestEmail() {
    if (!user?.email) return
    setTestSending(true)
    setEmailSaveMsg(null)
    try {
      await sendBookingConfirmationEmail({
        studentName: 'Test Student',
        studentEmail: user.email,
        date: new Date().toISOString().slice(0, 10),
        time: '10:00',
        duration: 30,
        calendarType: 'Presentation',
        lecturerName: 'Test Lecturer',
        presentationTopic: 'Test Topic',
      })
      setEmailSaveMsg({ type: 'success', text: `Test email sent to ${user.email}.` })
    } catch {
      setEmailSaveMsg({ type: 'error', text: 'Failed to send test email. Check your credentials.' })
    } finally {
      setTestSending(false)
      setTimeout(() => setEmailSaveMsg(null), 4000)
    }
  }

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwSubmitting, setPwSubmitting] = useState(false)

  async function handleSaveProfile() {
    await updateAdminSettings({ welcomeMessage: welcomeMsg.trim() })
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2500)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword !== confirmPassword) return setPwMsg({ type: 'error', text: 'New passwords do not match.' })
    if (newPassword.length < 6) return setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
    setPwSubmitting(true)
    const err = await changePassword(currentPassword, newPassword)
    if (err) {
      setPwMsg({ type: 'error', text: err })
    } else {
      setPwMsg({ type: 'success', text: 'Password updated successfully!' })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
    setPwSubmitting(false)
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }[] = [
    { key: 'profile',  label: 'Profile',  icon: User   },
    { key: 'general',  label: 'General',  icon: Globe  },
    { key: 'email',    label: 'Email',    icon: Mail   },
    { key: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage your account and booking preferences.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-gray-200 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon style={{ width: 14, height: 14 }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-in">
            {/* Avatar section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Public profile</h2>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl font-bold">
                  {orgName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{orgName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email ?? 'admin'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Organization name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Your organization"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Welcome message
                    <span className="font-normal text-gray-400 ml-1">(shown on booking page)</span>
                  </label>
                  <textarea
                    value={welcomeMsg}
                    onChange={e => setWelcomeMsg(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="e.g. Book your final year presentation slots for 2026!"
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-xs text-gray-400 mt-1">{welcomeMsg.length}/300</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleSaveProfile}
                  className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Save profile
                </button>
                {savedProfile && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                    <Check style={{ width: 14, height: 14 }} /> Saved!
                  </span>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Timezone</h2>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm text-gray-700">Current timezone</p>
                  <p className="text-xs text-gray-400 mt-0.5">Times shown to attendees in this timezone.</p>
                </div>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                  <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                  <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                  <option value="America/New_York">America/New_York (GMT-5/-4)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (GMT-8/-7)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* General tab */}
        {activeTab === 'general' && (
          <div className="space-y-4 animate-fade-in">
            {/* Booking policies */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Booking policies</h2>
                <p className="text-xs text-gray-500 mt-0.5">Control how students interact with their bookings.</p>
              </div>

              <div className="divide-y divide-gray-50">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Allow students to cancel</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When disabled, only admins and lecturers can cancel bookings.
                    </p>
                  </div>
                  <Toggle
                    checked={adminSettings.allowSelfCancel}
                    onChange={v => void updateAdminSettings({ allowSelfCancel: v })}
                  />
                </div>

                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Require confirmation</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      New bookings start as "Pending" and require admin approval.
                    </p>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>

                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">One booking per day</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prevents a student from booking multiple slots on the same date.
                    </p>
                  </div>
                  <Toggle checked={true} onChange={() => {}} />
                </div>
              </div>
            </div>

            {/* Notifications (UI only) */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
                <p className="text-xs text-gray-500 mt-0.5">Choose what you get notified about.</p>
              </div>

              {[
                { label: 'New booking', desc: 'When a student books a slot', on: true },
                { label: 'Booking cancelled', desc: 'When a booking is cancelled', on: true },
                { label: 'Upcoming reminder', desc: '24h before each booking', on: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between px-5 py-4 border-t border-gray-50 first:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={item.on} onChange={() => {}} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email tab */}
        {activeTab === 'email' && (
          <div className="space-y-4 animate-fade-in">
            {/* Status banner */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
              emailConnected
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-amber-50 border-amber-100 text-amber-700'
            }`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${emailConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              {emailConnected ? 'Email is connected — confirmations will be sent automatically.' : 'Email not connected. Students won\'t receive confirmation emails.'}
            </div>

            {/* Credentials card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">EmailJS credentials</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Get these from your{' '}
                    <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="text-gray-900 underline inline-flex items-center gap-0.5">
                      EmailJS dashboard <ExternalLink style={{ width: 10, height: 10 }} />
                    </a>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Service ID</label>
                  <input
                    type="text"
                    value={emailServiceId}
                    onChange={e => setEmailServiceId(e.target.value)}
                    placeholder="service_xxxxxxx"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template ID</label>
                  <input
                    type="text"
                    value={emailTemplateId}
                    onChange={e => setEmailTemplateId(e.target.value)}
                    placeholder="template_xxxxxxx"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Public Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={emailPublicKey}
                      onChange={e => setEmailPublicKey(e.target.value)}
                      placeholder="••••••••••••••••••••"
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                    </button>
                  </div>
                </div>
              </div>

              {emailSaveMsg && (
                <div className={`mt-4 flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg ${
                  emailSaveMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}>
                  {emailSaveMsg.type === 'success'
                    ? <Check style={{ width: 14, height: 14 }} />
                    : <AlertCircle style={{ width: 14, height: 14 }} />}
                  {emailSaveMsg.text}
                </div>
              )}

              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={handleSaveEmail}
                  className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Save & connect
                </button>
                {emailConnected && (
                  <button
                    onClick={handleTestEmail}
                    disabled={testSending}
                    className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    {testSending ? 'Sending…' : 'Send test email'}
                  </button>
                )}
                {emailConnected && (
                  <button
                    onClick={handleDisconnectEmail}
                    className="border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors ml-auto"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Template guide */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Email template variables</h2>
              <p className="text-xs text-gray-500 mb-3">Use these in your EmailJS template to personalise each confirmation email:</p>
              <div className="space-y-1.5">
                {[
                  ['{{to_name}}',            'Student\'s full name'],
                  ['{{to_email}}',           'Student\'s email (set as "To" address)'],
                  ['{{booking_date}}',       'e.g. Monday, June 9, 2026'],
                  ['{{booking_time}}',       'e.g. 10:00 AM'],
                  ['{{booking_duration}}',   'e.g. 30 minutes'],
                  ['{{calendar_type}}',      'e.g. Presentation'],
                  ['{{lecturer_name}}',      'Assigned lecturer (if any)'],
                  ['{{presentation_topic}}', 'Presentation topic (if any)'],
                ].map(([variable, desc]) => (
                  <div key={variable} className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0">{variable}</code>
                    <span className="text-gray-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security tab */}
        {activeTab === 'security' && (
          <div className="space-y-4 animate-fade-in">
            <form
              onSubmit={handlePasswordChange}
              className="bg-white rounded-2xl border border-gray-200 p-5"
            >
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Key style={{ width: 14, height: 14 }} className="text-gray-500" />
                Change password
              </h2>

              <div className="space-y-3 max-w-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Current password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={inputCls}
                  />
                </div>
              </div>

              {pwMsg && (
                <div className={`mt-4 flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg ${
                  pwMsg.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {pwMsg.type === 'success'
                    ? <Check style={{ width: 14, height: 14 }} />
                    : <AlertCircle style={{ width: 14, height: 14 }} />
                  }
                  {pwMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={!currentPassword || !newPassword || !confirmPassword || pwSubmitting}
                className="mt-4 bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pwSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>

            {/* Account info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Account</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900 font-medium">{user?.email ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-gray-500">Role</span>
                  <span className="text-gray-900 font-medium">Administrator</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
