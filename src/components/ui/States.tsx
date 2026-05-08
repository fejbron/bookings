// Standardized loading / empty / error states.
// Use these everywhere instead of ad-hoc spinners and error divs.

import { AlertCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

interface LoadingStateProps {
  fullscreen?: boolean
  dark?: boolean
  label?: string
}

export function LoadingState({ fullscreen, dark, label }: LoadingStateProps) {
  const wrap = fullscreen
    ? `min-h-screen flex flex-col items-center justify-center gap-3 ${dark ? 'bg-black' : 'bg-gray-50'}`
    : 'flex flex-col items-center justify-center gap-3 py-10'
  const ringCls = dark ? 'border-zinc-700 border-t-white' : 'border-gray-300 border-t-gray-900'
  const labelCls = dark ? 'text-zinc-500' : 'text-gray-500'
  return (
    <div className={wrap}>
      <div className={`w-6 h-6 border-2 ${ringCls} rounded-full animate-spin`} />
      {label && <p className={`text-xs ${labelCls}`}>{label}</p>}
    </div>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      {icon && <div className="mb-3 flex justify-center text-gray-200">{icon}</div>}
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  )
}

interface ErrorStateProps {
  error: Error
  retry?: () => void
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-5">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">Something went wrong</p>
          <p className="text-xs text-red-600 mt-0.5 break-words">{error.message}</p>
        </div>
        {retry && (
          <button
            onClick={retry}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    </div>
  )
}
