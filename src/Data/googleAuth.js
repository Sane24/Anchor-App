import { useGoogleLogin } from '@react-oauth/google'

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