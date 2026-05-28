# BookSlot

A multi-tenant booking platform built with React + Vite + Supabase.

## Platform Superadmin setup

The `/admin` route gives platform superadmins a dashboard to manage users, bookings, slots, session types, teams, audit logs, and platform-wide settings. Setup has three parts: SQL, Edge Functions, and (optionally) an env-var allowlist.

### 1. Apply the schema

Run [`database.sql`](./database.sql) against your Supabase project. The bottom of the file adds:

- `platform_admins`, `platform_settings`, `platform_audit_log` tables
- `suspended_at` columns on profile tables
- `is_platform_admin()` SECURITY DEFINER helper that every RLS policy consults
- A `get_platform_metrics()` RPC used by the Admin Overview page

It's idempotent — safe to re-run on an existing project.

### 2. Bootstrap the first admin

Pick one of:

#### Option A — Manual SQL grant

After the user has signed up via the normal flow, run once in the Supabase SQL editor:

```sql
INSERT INTO platform_admins (user_id)
SELECT id FROM auth.users WHERE email = 'you@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

#### Option B — Email allowlist via Edge Function

Deploy the `bootstrap-admin` function and set a comma-separated list of emails. When any of those users log in, they're auto-promoted (the function is idempotent and silently ignores non-allowlisted callers).

```bash
supabase functions deploy bootstrap-admin --no-verify-jwt
supabase secrets set SUPERADMIN_EMAILS="you@example.com,colleague@example.com"
```

Once at least one admin exists, further admins are easiest to grant from the Users page (`/admin/users`).

### 3. Enable hard-delete (optional)

The Users page exposes both **soft-delete** (clears the profile + cascades owned data, leaves `auth.users` intact) and **hard-delete** (truly removes the auth user). The latter requires the `admin-delete-user` Edge Function, which uses the service-role key server-side:

```bash
supabase functions deploy admin-delete-user --no-verify-jwt
```

The required secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are auto-populated by `supabase secrets` in most projects; verify with `supabase secrets list`.

### Required env vars

Front-end (`.env.local`):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Edge Function secrets (set via `supabase secrets set`):

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPERADMIN_EMAILS=a@x.com,b@y.com   # only needed for bootstrap-admin
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
