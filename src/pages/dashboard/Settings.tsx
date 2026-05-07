import { useState } from 'react'
import { Check, AlertCircle, Eye, EyeOff, Globe, Mail, Shield, User } from 'lucide-react'
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

export default function DashboardSettings() {
  const { profile, updateProfile, changePassword, user } = useAuth()
  const { userSettings, updateUserSettings } = useBookings()

  const [activeTab, setActiveTab] = useState<Tab>('profile')

  // Profile tab
  const [name, setName] = useState(profile?.name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [title, setTitle] = useState(profile?.title ?? '')
  const [bio, setBio] = useState(profile?.description ?? '')
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // General tab
  const [welcomeMsg, setWelcomeMsg] = useState(userSettings.welcomeMessage)
  const [allowCancel, setAllowCancel] = useState(userSettings.allowSelfCancel)
  const [generalSaved, setGeneralSaved] = useState(false)

  // Email tab
  const savedCfg = getEmailConfig()
  const [emailServiceId, setEmailServiceId] = useState(savedCfg.serviceId)
  const [emailTemplateId, setEmailTemplateId] = useState(savedCfg.templateId)
  const [emailPublicKey, setEmailPublicKey] = useState(savedCfg.publicKey)
  const [showKey, setShowKey] = useState(false)
  const [emailConnected, setEmailConnected] = useState(isEmailConfigured())
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testSending, setTestSending] = useState(false)

  // Security tab
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  async function handleSaveProfile() {
    if (!name.trim()) { setProfileMsg({ type: 'error', text: 'Name is required.' }); return }
    if (!username.trim()) { setProfileMsg({ type: 'error', text: 'Username is required.' }); return }
    if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(username)) {
      setProfileMsg({ type: 'error', text: 'Username must be 3–32 chars: lowercase, numbers, hyphens.' }); return
    }
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await updateProfile({ name, username, title, description: bio, isPublic })
      setProfileMsg({ type: 'success', text: 'Profile saved.' })
      setTimeout(() => setProfileMsg(null), 3000)
    } catch (e) {
      setProfileMsg({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save.' })
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleSaveGeneral() {
    await updateUserSettings({ welcomeMessage: welcomeMsg, allowSelfCancel: allowCancel })
    setGeneralSaved(true)
    setTimeout(() => setGeneralSaved(false), 2500)
  }

  async function handleSaveEmail() {
    if (!emailServiceId.trim() || !emailTemplateId.trim() || !emailPublicKey.trim()) {
      setEmailMsg({ type: 'error', text: 'All three fields are required.' }); return
    }
    saveEmailConfig(emailServiceId.trim(), emailTemplateId.trim(), emailPublicKey.trim())
    setEmailConnected(true)
    setEmailMsg({ type: 'success', text: 'Email connected.' })
    setTimeout(() => setEmailMsg(null), 3000)
  }

  function handleDisconnectEmail() {
    clearEmailConfig()
    setEmailServiceId(''); setEmailTemplateId(''); setEmailPublicKey('')
    setEmailConnected(false); setEmailMsg(null)
  }

  async function handleTestEmail() {
    if (!user?.email) return
    setTestSending(true); setEmailMsg(null)
    try {
      await sendBookingConfirmationEmail({
        studentName: 'Test User', studentEmail: user.email,
        date: new Date().toISOString().slice(0, 10), time: '10:00', duration: 30,
        calendarType: 'Test Session', presentationTopic: 'Test Topic',
      })
      setEmailMsg({ type: 'success', text: `Test email sent to ${user.email}.` })
    } catch {
      setEmailMsg({ type: 'error', text: 'Failed to send. Check your credentials.' })
    } finally {
      setTestSending(false)
      setTimeout(() => setEmailMsg(null), 4000)
    }
  }

  async function handleChangePassword() {
    if (!newPw) { setPwMsg({ type: 'error', text: 'Enter a new password.' }); return }
    if (newPw.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return }
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    setPwLoading(true); setPwMsg(null)
    const err = await changePassword(currentPw, newPw)
    if (err) {
      setPwMsg({ type: 'error', text: err })
    } else {
      setPwMsg({ type: 'success', text: 'Password updated.' })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwMsg(null), 3000)
    }
    setPwLoading(false)
  }

  const TABS: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'general', label: 'General', icon: Globe },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="max-w-3xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your profile, notifications, and account.</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-44 shrink-0 space-y-0.5">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${activeTab === key ? 'bg-white border border-[var(--border)] text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'}`}>
                <Icon style={{ width: 15, height: 15 }} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* Profile */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Public profile</h2>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={80} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Username</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                      <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} maxLength={32} className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Title / role</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Professor, Consultant…" maxLength={80} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={400} placeholder="A short bio shown on your booking page…" className={`${inputCls} resize-none`} />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Public profile</p>
                    <p className="text-xs text-gray-500 mt-0.5">Show your page in the directory</p>
                  </div>
                  <Toggle checked={isPublic} onChange={setIsPublic} />
                </div>

                {profileMsg && (
                  <div className={`flex items-center gap-2 text-sm px-3.5 py-2.5 rounded-lg ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {profileMsg.type === 'success' ? <Check style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14 }} />}
                    {profileMsg.text}
                  </div>
                )}

                <button onClick={handleSaveProfile} disabled={profileSaving} className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            )}

            {/* General */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">General settings</h2>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Welcome message</label>
                  <textarea value={welcomeMsg} onChange={e => setWelcomeMsg(e.target.value)} rows={3} maxLength={300} placeholder="Shown at the top of your booking page…" className={`${inputCls} resize-none`} />
                </div>

                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Allow self-cancellation</p>
                    <p className="text-xs text-gray-500 mt-0.5">Let clients cancel their own bookings</p>
                  </div>
                  <Toggle checked={allowCancel} onChange={setAllowCancel} />
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={handleSaveGeneral} className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                    Save
                  </button>
                  {generalSaved && <span className="text-sm text-emerald-600 font-medium flex items-center gap-1"><Check style={{ width: 13, height: 13 }} />Saved</span>}
                </div>
              </div>
            )}

            {/* Email */}
            {activeTab === 'email' && (
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Email notifications</h2>
                  {emailConnected && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <Check style={{ width: 11, height: 11 }} /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Connect EmailJS to send confirmation emails when you confirm a booking.</p>

                <div className="space-y-3">
                  {[
                    { label: 'Service ID', val: emailServiceId, set: setEmailServiceId, placeholder: 'service_xxxxxxx' },
                    { label: 'Template ID', val: emailTemplateId, set: setEmailTemplateId, placeholder: 'template_xxxxxxx' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                      <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className={inputCls} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Public Key</label>
                    <div className="relative">
                      <input type={showKey ? 'text' : 'password'} value={emailPublicKey} onChange={e => setEmailPublicKey(e.target.value)} placeholder="••••••••••••••••" className={`${inputCls} pr-10`} />
                      <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showKey ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                      </button>
                    </div>
                  </div>
                </div>

                {emailMsg && (
                  <div className={`flex items-center gap-2 text-sm px-3.5 py-2.5 rounded-lg ${emailMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {emailMsg.type === 'success' ? <Check style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14 }} />}
                    {emailMsg.text}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleSaveEmail} className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">
                    Save & connect
                  </button>
                  {emailConnected && (
                    <>
                      <button onClick={handleTestEmail} disabled={testSending} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        {testSending ? 'Sending…' : 'Send test email'}
                      </button>
                      <button onClick={handleDisconnectEmail} className="px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Change password</h2>

                {[
                  { label: 'Current password', val: currentPw, set: setCurrentPw },
                  { label: 'New password', val: newPw, set: setNewPw },
                  { label: 'Confirm new password', val: confirmPw, set: setConfirmPw },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                    <input type="password" value={f.val} onChange={e => f.set(e.target.value)} className={inputCls} />
                  </div>
                ))}

                {pwMsg && (
                  <div className={`flex items-center gap-2 text-sm px-3.5 py-2.5 rounded-lg ${pwMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {pwMsg.type === 'success' ? <Check style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14 }} />}
                    {pwMsg.text}
                  </div>
                )}

                <button onClick={handleChangePassword} disabled={pwLoading} className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {pwLoading ? 'Updating…' : 'Update password'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
