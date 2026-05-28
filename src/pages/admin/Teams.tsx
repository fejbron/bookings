import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, Trash2 } from 'lucide-react'
import { listAllTeams } from '../../lib/db/admin/queries'
import { deleteTeamMember } from '../../lib/db/admin/mutations'
import { ErrorState, LoadingState } from '../../components/ui/States'
import type { TeamMember } from '../../types'

export default function AdminTeams() {
  const [teams, setTeams] = useState<TeamMember[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const next = await listAllTeams()
      setTeams(next)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const filtered = useMemo(() => {
    if (!teams) return []
    const term = search.trim().toLowerCase()
    return teams.filter((t) => {
      if (!term) return true
      return (
        t.memberEmail.toLowerCase().includes(term)
        || t.hostUserId.toLowerCase().includes(term)
        || t.role.toLowerCase().includes(term)
      )
    })
  }, [teams, search])

  async function handleDelete(id: string) {
    if (!confirm('Remove this team membership?')) return
    setActing(id); setActionError(null)
    try {
      await deleteTeamMember(id)
      await reload()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setActing(null)
    }
  }

  if (loading && !teams) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Team memberships</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Every host/member relationship across the platform.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 14, height: 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, host id, or role"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {actionError && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{actionError}</div>
      )}

      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--border)]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No team memberships match.</td></tr>
              )}
              {filtered.map((t) => {
                const busy = acting === t.id
                const statusBadge = t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                return (
                  <tr key={t.id} className="border-t border-[var(--border)] hover:bg-gray-50">
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-500">{t.hostUserId.slice(0, 12)}…</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 truncate">{t.memberEmail}</p>
                      {t.memberUserId && <p className="text-[10px] font-mono text-gray-400">{t.memberUserId.slice(0, 12)}…</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 capitalize">{t.role}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${statusBadge}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{format(parseISO(t.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          disabled={busy}
                          onClick={() => handleDelete(t.id)}
                          title="Remove membership"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
