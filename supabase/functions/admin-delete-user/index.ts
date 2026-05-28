// admin-delete-user — hard-delete a Supabase auth user.
//
// Verifies the caller is a platform_admins row, then uses the service-role key
// to call auth.admin.deleteUser(...). Cascades remove all owned data via the
// ON DELETE CASCADE foreign keys defined in database.sql.
//
// Deploy:
//   supabase functions deploy admin-delete-user --no-verify-jwt
//
// Required secrets (set with `supabase secrets set …`):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//
// Invoke from the client via supabase.functions.invoke('admin-delete-user', { body: { userId } }).

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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Function not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

  // 1) Use the caller's JWT (passed via Authorization) to identify them.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'Invalid session' }, 401)

  // 2) Service-role client. Bypasses RLS so we can check + write directly.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 3) Verify caller is a platform admin.
  const { data: admin, error: adminErr } = await adminClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (adminErr) return json({ error: 'Admin check failed' }, 500)
  if (!admin) return json({ error: 'Not authorized' }, 403)

  // 4) Parse + validate input.
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const targetUserId: unknown = body?.userId
  if (typeof targetUserId !== 'string' || targetUserId.length === 0) {
    return json({ error: 'userId is required' }, 400)
  }
  if (targetUserId === user.id) {
    return json({ error: 'Cannot delete your own account' }, 400)
  }

  // 5) Capture profile info for the audit metadata before deletion.
  const [lecRes, proRes] = await Promise.all([
    adminClient.from('lecturer_profiles').select('email, name, username').eq('user_id', targetUserId).maybeSingle(),
    adminClient.from('professional_profiles').select('email, name, username').eq('user_id', targetUserId).maybeSingle(),
  ])
  const profileSnapshot = lecRes.data ?? proRes.data ?? null

  // 6) Hard-delete the auth user. Cascades clean up owned rows.
  const { error: delErr } = await adminClient.auth.admin.deleteUser(targetUserId)
  if (delErr) return json({ error: delErr.message }, 500)

  // 7) Write audit entry server-side (RLS would normally block this for the
  // service role, but service-role bypasses RLS so we're fine).
  await adminClient.from('platform_audit_log').insert({
    actor_user_id: user.id,
    action: 'hard_delete_user',
    target_type: 'user',
    target_id: targetUserId,
    metadata: { profile: profileSnapshot },
  })

  return json({ ok: true })
})
