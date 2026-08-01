import { getStoredGoogleToken, clearGoogleToken } from './googleAuth'
import { looksLikeTask } from './gmailFilter'
import { suggestFirstStep } from '../firstSteps'
import { setImportedData } from '../screens/weekSampleData'

// Google reads for the briefing scans. Everything here is read-only against
// Calendar and Gmail; results are shaped into the week layer's task/event
// format and handed to setImportedData, which every screen already reads.

// Implicit-flow tokens die after ~an hour. A 401 means "reconnect", not
// "there's nothing there" — so it clears the stale token and surfaces as its
// own error type for the screens to explain.
export class TokenExpiredError extends Error {
  constructor() {
    super('Google session expired')
    this.name = 'TokenExpiredError'
  }
}

function authFetch(url) {
  const token = getStoredGoogleToken()
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((response) => {
    if (response.status === 401 || response.status === 403) {
      clearGoogleToken()
      throw new TokenExpiredError()
    }
    if (!response.ok) throw new Error(`Google request failed: ${response.status}`)
    return response.json()
  })
}

// Local-time date parts. toISOString would shift evening events into the
// wrong day for anyone west of UTC.
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function localClock(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Calendar entries from the start of today through `daysAhead` days.
export async function fetchCalendarEvents(daysAhead = 1) {
  if (!getStoredGoogleToken()) return []

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + daysAhead)

  const url =
    'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
    `?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}` +
    '&singleEvents=true&orderBy=startTime&maxResults=50'

  const data = await authFetch(url)
  return (data.items || []).map((event) => {
    const isAllDay = !event.start?.dateTime
    const startAt = new Date(event.start?.dateTime || `${event.start?.date}T00:00:00`)
    const endAt = new Date(event.end?.dateTime || `${event.end?.date}T00:00:00`)
    return {
      id: `gcal-${event.id}`,
      title: event.summary || '(No title)',
      date: localDateKey(startAt),
      start: isAllDay ? '' : localClock(startAt),
      end: isAllDay ? '' : localClock(endAt),
      source: 'calendar',
    }
  })
}

// How many surviving emails become tasks. The briefing is about choosing
// three anchors, not mirroring an inbox.
const MAX_MAIL_TASKS = 6

// Recent unread mail from the Primary tab, sieved down to things that look
// like a person asking for something (see gmailFilter.js), shaped as
// today-attention tasks.
export async function fetchGmailAsTasks() {
  if (!getStoredGoogleToken()) return []

  // Wider than Primary on purpose: Canvas/bCourses and friends land in the
  // Updates tab, and that's exactly the mail a student needs surfaced. The
  // allowlist in gmailFilter.js separates school-robot mail from the rest of
  // the machine noise. Recent only — week-old unread mail is a graveyard.
  const query = encodeURIComponent(
    'is:unread newer_than:7d -category:promotions -category:social -category:forums'
  )
  const list = await authFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${query}`
  )
  const ids = (list.messages || []).map((m) => m.id)

  const today = localDateKey(new Date())
  const details = await Promise.all(
    ids.map(async (id) => {
      const detail = await authFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
          '?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=List-Unsubscribe'
      )
      const headers = detail.payload?.headers || []
      const header = (name) => headers.find((h) => h.name.toLowerCase() === name)?.value
      return {
        id,
        subject: header('subject') || '(No subject)',
        from: header('from') || '',
        hasUnsubscribe: Boolean(header('list-unsubscribe')),
      }
    })
  )

  const kept = details.filter(looksLikeTask)
  // Tuning aid: if the scan feels wrong, this says whether the query or the
  // filter is the one to blame.
  console.log(`Gmail scan: ${details.length} unread fetched, ${kept.length} look like tasks`)

  return kept
    .slice(0, MAX_MAIL_TASKS)
    .map(({ id, subject, from }) => ({
      id: `mail-${id}`,
      title: subject,
      from,
      date: today,
      dueTime: '',
      source: 'gmail',
      completed: false,
      firstStep: suggestFirstStep(subject, 'gmail'),
    }))
}

// One scan feeds every screen: unread mail lands as today's tasks, calendar
// entries land as events on their days. Rescans replace the previous import,
// so nothing duplicates; user edits/deletions live in the week layer's diff
// maps and survive.
export async function scanGoogle(daysAhead = 7) {
  if (!getStoredGoogleToken()) return { connected: false, tasks: 0, events: 0 }

  const [events, tasks] = await Promise.all([
    fetchCalendarEvents(daysAhead),
    fetchGmailAsTasks(),
  ])
  setImportedData({ tasks, events })
  return { connected: true, tasks: tasks.length, events: events.length }
}
