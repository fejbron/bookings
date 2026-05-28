import { useEffect, useState } from 'react'
import { Save, Check, Megaphone, ShieldAlert, ToggleLeft } from 'lucide-react'
import { getPlatformSettings, type PlatformSettings as PS } from '../../lib/db/admin/queries'
import { updatePlatformSettings } from '../../lib/db/admin/mutations'
import { ErrorState, LoadingState } from '../../components/ui/States'

export default function AdminSettings() {
  const [settings, setSettings] = useState<PS | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [signupsEnabled, setSignupsEnabled] = useState(true)
  const [bannerMessage, setBannerMessage] = useState('')
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const s = await getPlatformSettings()
      setSettings(s)
      setSignupsEnabled(s.signupsEnabled)
      setBannerMessage(s.bannerMessage)
      setMaintenanceMessage(s.maintenanceMessage)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const dirty = !!settings && (
    settings.signupsEnabled !== signupsEnabled
    || settings.bannerMessage !== bannerMessage
    || settings.maintenanceMessage !== maintenanceMessage
  )

  async function save() {
    setSaving(true); setSaveError(null)
    try {
      await updatePlatformSettings({ signupsEnabled, bannerMessage, maintenanceMessage })
      setSavedAt(Date.now())
      await reload()
      setTimeout(() => setSavedAt(null), 2500)
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !settings) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Site-wide toggles. Changes apply immediately to all visitors.</p>
      </div>

      <div className="space-y-4">
        {/* Signups */}
        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center"><ToggleLeft style={{ width: 18, height: 18 }} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">New signups</p>
              <p className="text-xs text-gray-500 mt-0.5">When off, the signup form is hidden and new accounts cannot be created. Existing users keep working.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={signupsEnabled}
                onChange={(e) => setSignupsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"><Megaphone style={{ width: 18, height: 18 }} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Announcement banner</p>
              <p className="text-xs text-gray-500 mt-0.5">Short message shown across the site (e.g. release notes). Leave blank to hide.</p>
            </div>
          </div>
          <input
            type="text"
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            maxLength={200}
            placeholder="e.g. We're launching a redesigned booking page next week."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <p className="mt-1 text-[11px] text-gray-400 text-right">{bannerMessage.length}/200</p>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center"><ShieldAlert style={{ width: 18, height: 18 }} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Maintenance notice</p>
              <p className="text-xs text-gray-500 mt-0.5">Shown when the platform is under maintenance. Leave blank to hide.</p>
            </div>
          </div>
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. We're upgrading our database between 8–9 PM UTC. Bookings will pause briefly."
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
          />
          <p className="mt-1 text-[11px] text-gray-400 text-right">{maintenanceMessage.length}/500</p>
        </div>
      </div>

      {saveError && (
        <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{saveError}</div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {settings?.updatedAt && settings.updatedAt !== new Date(0).toISOString()
            ? `Last updated ${new Date(settings.updatedAt).toLocaleString()}`
            : 'Never updated'}
        </p>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
        >
          {savedAt ? <><Check style={{ width: 14, height: 14 }} /> Saved</> : <><Save style={{ width: 14, height: 14 }} /> {saving ? 'Saving…' : 'Save changes'}</>}
        </button>
      </div>
    </div>
  )
}
