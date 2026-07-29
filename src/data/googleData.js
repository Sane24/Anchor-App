import { getStoredGoogleToken } from './googleAuth'

// Fetch today's Calendar events
export async function fetchCalendarEvents() {
  const token = getStoredGoogleToken()
  if (!token) return []

  const now = new Date()
  const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString()

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfDay}&timeMax=${endOfDay}&singleEvents=true&orderBy=startTime`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    console.error('Calendar fetch failed:', response.status)
    return []
  }

  const data = await response.json()
  return (data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '(No title)',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
  }))
}

// Fetch recent unread Gmail messages (excluding promos/social), shaped as tasks
export async function fetchGmailAsTasks() {
  const token = getStoredGoogleToken()
  if (!token) return []

  const query = encodeURIComponent('is:unread -category:promotions -category:social')
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${query}`

  const listResponse = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!listResponse.ok) {
    console.error('Gmail list fetch failed:', listResponse.status)
    return []
  }

  const listData = await listResponse.json()
  const messageIds = (listData.messages || []).map((m) => m.id)

  const tasks = await Promise.all(
    messageIds.map(async (id) => {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`
      const detailResponse = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const detail = await detailResponse.json()
      const headers = detail.payload?.headers || []
      const subject = headers.find((h) => h.name === 'Subject')?.value || '(No subject)'
      const from = headers.find((h) => h.name === 'From')?.value || ''

      return {
        id,
        title: subject,
        from,
        source: 'gmail',
      }
    })
  )

  return tasks
}