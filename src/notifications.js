// Reminders for Anchor: morning briefing + night reflection. — Reed
//
// Plain module (not a hook) so timers survive navigating between tabs:
// module state lives as long as the page does, React components come and go.
//
// Two layers, because a web app can't reach you when it's closed:
//   1. An OS notification, when a tab happens to be open at the right time.
//   2. A catch-up nudge inside the app, shown next time you open it if the
//      window passed and you haven't done the ritual. This one needs no
//      permission and always works — it's the layer people actually get.
//
// Honest limitation for the writeup: true closed-tab push needs a service
// worker plus a push backend. Layer 2 is the design answer to that constraint,
// not a workaround for it.

const KEY = 'anchor-notifications' // { enabled, morning: "HH:MM", evening: "HH:MM" }
const FIRED_KEY = 'anchor-notifications-fired' // { morning: "YYYY-MM-DD", ... }
const SEEN_KEY = 'anchor-notifications-seen' // in-app nudges dismissed today

const DEFAULTS = { enabled: false, morning: '08:30', evening: '21:30' }

export const REMINDERS = [
  {
    kind: 'morning',
    title: 'Morning briefing',
    body: 'Steady the day: pick your three anchors.',
    to: '/briefing',
    action: 'Start briefing',
  },
  {
    kind: 'evening',
    title: 'Night reflection',
    body: 'Close out the day and set up tomorrow.',
    to: '/reflection',
    action: 'Close the day',
  },
]

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

/* ---------- settings ---------- */

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback }
  } catch {
    return { ...fallback }
  }
}

export function getSettings() {
  return readJSON(KEY, DEFAULTS)
}

export function saveSettings(next) {
  const merged = { ...getSettings(), ...next }
  localStorage.setItem(KEY, JSON.stringify(merged))
  tick()
  notify()
  return merged
}

/* ---------- time helpers ---------- */

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Has "HH:MM" already passed today?
function isPast(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  const now = new Date()
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
}

/* ---------- the scheduler ----------
   A wall-clock poll rather than one long setTimeout. A 14-hour timer looks
   tidy but doesn't survive what actually happens to a laptop: background-tab
   throttling, sleep, and tab discarding all break it. Re-reading the clock
   every 30s is dull and correct — and it means a machine that wakes up past
   the reminder time still notices. */

const TICK_MS = 30_000
let interval = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function fire(title, body) {
  if (getPermission() !== 'granted') return
  try {
    // No icon: there's no favicon in this project, and an absolute path would
    // 404 anyway once deployed under a subpath.
    new Notification(title, { body, tag: title })
  } catch {
    // Mobile Chrome requires a service worker for this constructor.
  }
}

function tick() {
  const settings = getSettings()
  const fired = readJSON(FIRED_KEY, {})
  const today = todayKey()
  let changed = false

  for (const reminder of REMINDERS) {
    if (!isPast(settings[reminder.kind])) continue
    if (fired[reminder.kind] === today) continue

    // Mark first: a failed or blocked notification shouldn't retry every 30s.
    fired[reminder.kind] = today
    changed = true
    if (settings.enabled) fire(reminder.title, reminder.body)
  }

  if (changed) {
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
    notify()
  }
}

export function start() {
  if (!isSupported() || interval) return
  tick()
  interval = setInterval(tick, TICK_MS)
  // Catch the case where the machine slept through a reminder: checking on
  // wake/refocus is what makes the nudge show up promptly rather than up to
  // 30s later.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick()
  })
}

/* ---------- in-app catch-up ----------
   Which reminder windows have passed today and not been dismissed. The caller
   decides whether the ritual is actually done — it owns the store. */

export function passedReminders() {
  const settings = getSettings()
  if (!settings.enabled) return []
  const seen = readJSON(SEEN_KEY, {})
  const today = todayKey()
  return REMINDERS.filter(
    (reminder) => isPast(settings[reminder.kind]) && seen[reminder.kind] !== today
  )
}

export function dismissReminder(kind) {
  const seen = readJSON(SEEN_KEY, {})
  seen[kind] = todayKey()
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
  notify()
}

export function sendTest() {
  fire('Anchor', 'Reminders are working. Steady the day.')
}
