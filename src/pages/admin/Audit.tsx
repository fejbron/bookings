import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, FileClock } from 'lucide-react'
import { listAuditLog, type AuditEntry } from '../../lib/db/admin/queries'
import { ErrorState, LoadingState } from '../../components/ui/States'

const ACTION_BADGE: Record<string, string> = {
  suspend_profile:      'bg-amber-50 text-amber-700',
  unsuspend_profile:    'bg-emerald-50 text-emerald-700',
  soft_delete_user:     'bg-rose-50 text-rose-700',
  hard_delete_user:     'bg-rose-100 text-rose-800',
  promote_admin:        'bg-indigo-50 text-indigo-700',
  demote_admin:         'bg-gray-100 text-gray-700',
  force_cancel_booking: 'bg-amber-50 text-amber-700',
  delete_booking:       'bg-rose-50 text-rose-700',
  bulk_delete_slots:    'bg-rose-50 text-rose-700',
  delete_calendar_type: 'bg-rose-50 text-rose-700',
  delete_team_member:   'bg-rose-50 text-rose-700',
  update_platform_settings: 'bg-sky-50 text-sky-700',
  self_promote_via_allowlist: 'bg-indigo-50 text-indigo-700',
}

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

export default function AdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('')

  async function reload() {
    setLoading(true)
    try {
      const next = await listAuditLog(500)
      setEntries(next)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const allActions = useMemo(() => {
    if (!entries) return []
    return Array.from(new Set(entries.map((e) => e.action))).sort()
  }, [entries])

  const filtered = useMemo(() => {
    if (!entries) return []
    const term = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (action && e.action !== action) return false
      if (!term) return true
      return (
        e.action.toLowerCase().includes(term)
        || (e.actorName?.toLowerCase().includes(term) ?? false)
        || (e.targetId?.toLowerCase().includes(term) ?? false)
        || (e.targetType?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [entries, search, action])

  if (loading && !entries) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Every admin action, in order. Showing the {entries?.length ?? 0} most recent.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 14, height: 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, or target"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white"
        >
          <option value="">All actions</option>
          {allActions.map((a) => (
            <option key={a} value={a}>{actionLabel(a)}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileClock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No audit entries match.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((e) => {
              const badge = ACTION_BADGE[e.action] ?? 'bg-gray-100 text-gray-700'
              const metaKeys = Object.keys(e.metadata ?? {})
              return (
                <li key={e.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge}`}>
                      {actionLabel(e.action)}
                    </span>
                    <span className="text-sm text-gray-700">
                      by <strong className="font-medium">{e.actorName ?? (e.actorUserId ? `${e.actorUserId.slice(0, 8)}…` : 'unknown')}</strong>
                    </span>
                    {e.targetType && e.targetId && (
                      <span className="text-xs text-gray-500">
                        on {e.targetType} <span className="font-mono">{e.targetId.slice(0, 8)}…</span>
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{format(parseISO(e.createdAt), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  {metaKeys.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600">Metadata</summary>
                      <pre className="mt-1.5 text-[11px] bg-gray-50 rounded p-2 overflow-x-auto text-gray-600">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
