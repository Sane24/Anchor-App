import { useGoogleLogin } from '@react-oauth/google'

// Set VITE_GOOGLE_CLIENT_ID in a local .env (see .env.example). Without it the
// Google SDK throws "Missing required parameter client_id" the moment anything
// calls useGoogleLogin, so callers must check isGoogleConfigured first and skip
// rendering the components that use it.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
export const isGoogleConfigured = Boolean(GOOGLE_CLIENT_ID)

// Scopes: read-only access to Calendar events and Gmail messages
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly'

export function useGoogleConnect(onSuccess) {
  return useGoogleLogin({
    scope: SCOPES,
    onSuccess: (tokenResponse) => {
      // tokenResponse.access_token is what we use to call Calendar/Gmail APIs
      localStorage.setItem('google_access_token', tokenResponse.access_token)
      onSuccess(tokenResponse.access_token)
    },
    onError: (error) => {
      console.error('Google sign-in failed:', error)
    },
  })
}

export function getStoredGoogleToken() {
  return localStorage.getItem('google_access_token')
}

export function clearGoogleToken() {
  localStorage.removeItem('google_access_token')
}