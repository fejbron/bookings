// bootstrap-admin — promote the caller to platform_admins if their email is
// listed in the SUPERADMIN_EMAILS secret. Idempotent.
//
// Use case: bring up the very first superadmin without manual SQL, or keep an
// allowlist of trusted emails that auto-promote on first login.
//
// Deploy:
//   supabase functions deploy bootstrap-admin --no-verify-jwt
//
// Required secrets (set with `supabase secrets set …`):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   SUPERADMIN_EMAILS  (comma-separated; e.g. "a@x.com,b@y.com")

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPERADMIN_EMAILS = Deno.env.get('SUPERADMIN_EMAILS') ?? ''

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Function not configured' }, 500)
  }

  const allowlist = SUPERADMIN_EMAILS
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (allowlist.length === 0) {
    return json({ promoted: false, reason: 'no_allowlist' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user || !user.email) return json({ error: 'Invalid session' }, 401)

  const callerEmail = user.email.toLowerCase()
  if (!allowlist.includes(callerEmail)) {
    return json({ promoted: false, reason: 'not_allowlisted' })
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: existing } = await adminClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return json({ promoted: false, reason: 'already_admin' })
  }

  const { error: insErr } = await adminClient
    .from('platform_admins')
    .insert({ user_id: user.id, role: 'superadmin', granted_by: user.id })
  if (insErr) return json({ error: insErr.message }, 500)

  await adminClient.from('platform_audit_log').insert({
    actor_user_id: user.id,
    action: 'self_promote_via_allowlist',
    target_type: 'user',
    target_id: user.id,
    metadata: { email: callerEmail },
  })

  return json({ promoted: true })
})
