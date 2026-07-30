// Notifications for Anchor: morning briefing + evening reflection reminders. — Reed
//
// Plain module (not a hook) so timers survive navigating between tabs:
// module state lives as long as the page does, React components come and go.
//
// Honest limitation, for the writeup: this is a browser-tab scheduler. With no
// push server, reminders fire only while an Anchor tab is open. True
// closed-tab push needs a service worker + a backend — out of scope for M4.

const KEY = 'anchor-notifications' // { enabled, morning: "HH:MM", evening: "HH:MM" }

const DEFAULTS = { enabled: false, morning: '08:30', evening: '21:30' }

/* ---------- support + permission ---------- */

export function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission() {
  // 'granted' | 'denied' | 'default' | 'unsupported'
  return isSupported() ? Notification.permission : 'unsupported'
}

export async function requestPermission() {
  if (!isSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    // Old Safari uses the callback form
    return new Promise((resolve) => Notification.requestPermission(resolve))
  }
}

/* ---------- settings (localStorage) ---------- */

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(next) {
  const merged = { ...getSettings(), ...next }
  localStorage.setItem(KEY, JSON.stringify(merged))
  reschedule()
  return merged
}

/* ---------- scheduling ---------- */

let timers = []

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}

// ms from now until the next occurrence of "HH:MM" (today if still ahead, else tomorrow)
function msUntil(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target - now
}

function fire(title, body) {
  if (getPermission() !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag: title })
  } catch {
    // Some browsers (mobile Chrome) require a service worker; fail silently.
  }
}

function scheduleOne(hhmm, title, body) {
  const t = setTimeout(() => {
    fire(title, body)
    reschedule() // set up tomorrow's
  }, msUntil(hhmm))
  timers.push(t)
}

export function reschedule() {
  clearTimers()
  const s = getSettings()
  if (!s.enabled || getPermission() !== 'granted') return
  scheduleOne(s.morning, 'Morning briefing', 'Steady the day: pick your three anchors.')
  scheduleOne(s.evening, 'Night reflection', 'Close out the day and set up tomorrow.')
}

export function sendTest() {
  fire('Anchor test notification', 'Notifications are working. Steady the day.')
}

// Start timers as soon as any part of the app imports this module.
if (isSupported()) reschedule()