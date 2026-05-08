import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
}

// Use in-process lock instead of the default navigator.locks. The browser
// Lock API preempts holders ("Lock was released because another request
// stole it") under concurrent requests; processLock serialises auth work
// in-memory, which is what we want for a single SPA tab.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: processLock,
  },
})
