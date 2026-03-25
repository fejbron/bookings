import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthContextType {
  isAdmin: boolean
  login: (pin: string) => boolean
  logout: () => void
  changePin: (currentPin: string, newPin: string) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const PIN_STORAGE_KEY = 'bookslot-admin-pin'
const SESSION_KEY = 'bookslot-admin-session'
const DEFAULT_PIN = 'admin123'

function getStoredPin(): string {
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true')

  const login = useCallback((pin: string): boolean => {
    if (pin === getStoredPin()) {
      setIsAdmin(true)
      sessionStorage.setItem(SESSION_KEY, 'true')
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setIsAdmin(false)
    sessionStorage.removeItem(SESSION_KEY)
  }, [])

  const changePin = useCallback((currentPin: string, newPin: string): boolean => {
    if (currentPin !== getStoredPin()) return false
    if (!newPin.trim() || newPin.length < 4) return false
    localStorage.setItem(PIN_STORAGE_KEY, newPin)
    return true
  }, [])

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout, changePin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
