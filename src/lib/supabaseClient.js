import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// PKCE rather than the default implicit flow. Implicit returns auth tokens in
// the URL *hash* — which is exactly where HashRouter keeps its routes, so the
// two race to own it when a password-reset link opens the app. PKCE comes back
// as `?code=` in the query string, which the router never touches.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})