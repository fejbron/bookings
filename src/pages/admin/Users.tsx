import { useEffect, useMemo, useState } from 'react'
import {
  Search, Shield, ShieldOff, Pause, Play, Trash2, AlertTriangle,
  GraduationCap, Briefcase, X,
} from 'lucide-react'
import { listAllUsers, type AdminUserRow } from '../../lib/db/admin/queries'
import {
  suspendProfile, unsuspendProfile, softDeleteUser, hardDeleteUser,
  promoteAdmin, demoteAdmin,
} from '../../lib/db/admin/mutations'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../hooks'

type Mode = 'all' | 'lecturer' | 'professional' | 'suspended' | 'admin'

interface ConfirmAction {
  kind: 'soft-delete' | 'hard-delete' | 'demote'
  row: AdminUserRow
}

export default function AdminUsers() {
  const { user } = useAuth()
  const [rows, setRows] = useState<AdminUserRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<Mode>('all')
  const [actingId, setActingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const next = await listAllUsers()
      setRows(next)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      const p = r.profile
      if (mode === 'lecturer' && p.accountType !== 'lecturer') return false
      if (mode === 'professional' && p.accountType !== 'professional') return false
      if (mode === 'suspended' && !p.suspendedAt) return false
      if (mode === 'admin' && !r.isAdmin) return false
      if (!term) return true
      return (
        p.name.toLowerCase().includes(term)
        || p.email.toLowerCase().includes(term)
        || (p.username?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [rows, search, mode])

  async function runAction(label: string, fn: () => Promise<void>, rowKey: string) {
    setActingId(rowKey)
    setActionError(null)
    try {
      await fn()
      await reload()
    } catch (err) {
      setActionError(`${label}: ${(err as Error).message}`)
    } finally {
      setActingId(null)
    }
  }

  async function handleConfirm() {
    if (!confirm) return
    const { kind, row } = confirm
    const userId = row.profile.userId
    if (!userId) return
    setConfirm(null)

    if (kind === 'soft-delete') {
      await runAction('Soft delete', () => softDeleteUser(userId, row.profile.accountType), row.profile.id)
    } else if (kind === 'hard-delete') {
      await runAction('Hard delete', () => hardDeleteUser(userId), row.profile.id)
    } else if (kind === 'demote') {
      await runAction('Demote admin', () => demoteAdmin(userId), row.profile.id)
    }
  }

  if (loading && !rows) return <LoadingState />
  if (error) return <div className="p-6"><ErrorState error={error} retry={reload} /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Manage every account on the platform.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ width: 14, height: 14 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or username"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', 'lecturer', 'professional', 'suspended', 'admin'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
                mode === m
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2.5">{actionError}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--border)]">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No users match this filter.</td></tr>
              )}
              {filtered.map((row) => {
                const p = row.profile
                const userId = p.userId
                const isMe = userId && user?.id === userId
                const isSuspended = !!p.suspendedAt
                const busy = actingId === p.id
                return (
                  <tr key={p.id} className="border-t border-[var(--border)] hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-semibold shrink-0 ${row.isAdmin ? 'bg-indigo-600' : 'bg-gray-900'}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name} {isMe && <span className="text-[10px] text-gray-400 font-normal">(you)</span>}</p>
                          <p className="text-xs text-gray-500 truncate">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.username ? `@${p.username}` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.accountType === 'lecturer' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                        {p.accountType === 'lecturer' ? <GraduationCap style={{ width: 10, height: 10 }} /> : <Briefcase style={{ width: 10, height: 10 }} />}
                        {p.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {row.isAdmin && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700"><Shield style={{ width: 10, height: 10 }} /> Admin</span>}
                        {isSuspended && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700"><Pause style={{ width: 10, height: 10 }} /> Suspended</span>}
                        {!row.isAdmin && !isSuspended && <span className="text-[10px] text-gray-400">Active</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Promote / demote */}
                        {userId && !isMe && (
                          row.isAdmin ? (
                            <button
                              disabled={busy}
                              title="Revoke admin"
                              onClick={() => setConfirm({ kind: 'demote', row })}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
                            >
                              <ShieldOff style={{ width: 14, height: 14 }} />
                            </button>
                          ) : (
                            <button
                              disabled={busy}
                              title="Grant admin"
                              onClick={() => runAction('Promote admin', () => promoteAdmin(userId), p.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40"
                            >
                              <Shield style={{ width: 14, height: 14 }} />
                            </button>
                          )
                        )}
                        {/* Suspend / unsuspend */}
                        {userId && (
                          isSuspended ? (
                            <button
                              disabled={busy}
                              title="Unsuspend"
                              onClick={() => runAction('Unsuspend', () => unsuspendProfile(userId, p.accountType), p.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
                            >
                              <Play style={{ width: 14, height: 14 }} />
                            </button>
                          ) : (
                            <button
                              disabled={busy}
                              title="Suspend"
                              onClick={() => runAction('Suspend', () => suspendProfile(userId, p.accountType), p.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-40"
                            >
                              <Pause style={{ width: 14, height: 14 }} />
                            </button>
                          )
                        )}
                        {/* Soft delete */}
                        {userId && !isMe && (
                          <button
                            disabled={busy}
                            title="Soft delete (keeps auth user)"
                            onClick={() => setConfirm({ kind: 'soft-delete', row })}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                        {/* Hard delete */}
                        {userId && !isMe && (
                          <button
                            disabled={busy}
                            title="Hard delete (removes auth user)"
                            onClick={() => setConfirm({ kind: 'hard-delete', row })}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40"
                          >
                            <AlertTriangle style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          kind={confirm.kind}
          row={confirm.row}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}

function ConfirmModal({ kind, row, onCancel, onConfirm }: {
  kind: 'soft-delete' | 'hard-delete' | 'demote'
  row: AdminUserRow
  onCancel: () => void
  onConfirm: () => void
}) {
  const title = kind === 'soft-delete' ? 'Soft delete user?'
    : kind === 'hard-delete' ? 'Hard delete user?'
      : 'Revoke admin access?'
  const body = kind === 'soft-delete'
    ? 'This removes the profile and cascades through their slots, bookings, and types. The auth account is kept (they can sign back in and re-setup).'
    : kind === 'hard-delete'
      ? 'This permanently deletes the auth user and every owned row. The action cannot be undone. Requires the admin-delete-user Edge Function to be deployed.'
      : `Remove platform-admin access from ${row.profile.name}? They keep their account and data.`
  const btn = kind === 'hard-delete' ? 'Hard delete' : kind === 'soft-delete' ? 'Soft delete' : 'Revoke'
  const danger = kind !== 'demote'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <AlertTriangle style={{ width: 18, height: 18 }} />
          </div>
          <button onClick={onCancel} className="p-1 rounded text-gray-400 hover:bg-gray-100"><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{body}</p>
        <p className="mt-3 text-xs text-gray-500">
          User: <strong>{row.profile.name}</strong> ({row.profile.email})
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {btn}
          </button>
        </div>
      </div>
    </div>
  )
}
