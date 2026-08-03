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

// Catches the OAuth provider token the instant it's available — this must
// live here, not in a React useEffect, because Supabase processes the
// redirect's ?code= during client init, often before any component mounts.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.provider_token) {
    localStorage.setItem('google_access_token', session.provider_token)
  }
})