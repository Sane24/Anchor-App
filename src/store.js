// Local persistence. localStorage-backed until there's a real backend.

const SESSIONS_KEY = 'anchor_focus_sessions'
const DAILY_PLANS_KEY = 'anchor_daily_plans_v1'
const LEGACY_TODAY_KEY = 'anchor_today_tasks'

export function dayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyPlan(date) {
  return {
    date,
    anchors: [],
    candidates: [],
    rollover: [],
  }
}

function readPlans() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_PLANS_KEY) || '{}')
  } catch (err) {
    console.error('Could not read daily plans:', err)
    return {}
  }
}

function writePlans(plans) {
  try {
    localStorage.setItem(DAILY_PLANS_KEY, JSON.stringify(plans))
  } catch (err) {
    console.error('Could not save daily plans:', err)
  }
}

export function loadDayPlan(date = new Date()) {
  const key = typeof date === 'string' ? date : dayKey(date)
  const plans = readPlans()
  if (plans[key]) return { ...emptyPlan(key), ...plans[key] }

  // Migrate tasks saved by the original Briefing implementation.
  if (key === dayKey()) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_TODAY_KEY) || '[]')
      if (legacy.length) {
        const migrated = {
          ...emptyPlan(key),
          anchors: legacy.map((item, index) => ({
            id: item.id || `legacy-${index}`,
            title: item.title || item.task || 'Untitled task',
            firstStep: item.firstStep || item.step || 'Open what you need',
            source: item.source || 'custom',
            completed: false,
            startedAt: null,
          })),
        }
        writePlans({ ...plans, [key]: migrated })
        localStorage.removeItem(LEGACY_TODAY_KEY)
        return migrated
      }
    } catch (err) {
      console.error('Could not migrate old Today tasks:', err)
    }
  }

  return emptyPlan(key)
}

export function saveDayPlan(plan, date = new Date()) {
  const key = typeof date === 'string' ? date : dayKey(date)
  const plans = readPlans()
  const saved = {
    ...emptyPlan(key),
    ...plan,
    date: key,
    updatedAt: new Date().toISOString(),
  }
  writePlans({ ...plans, [key]: saved })
  return saved
}

export function saveBriefingPlan(anchors, candidates) {
  const current = loadDayPlan()
  const selectedIds = new Set(anchors.map((anchor) => anchor.id))
  return saveDayPlan({
    ...current,
    anchors,
    candidates,
    rollover: current.rollover.filter((item) => !selectedIds.has(item.id)),
  })
}

export function updateTodayAnchor(anchorId, changes) {
  const current = loadDayPlan()
  return saveDayPlan({
    ...current,
    anchors: current.anchors.map((anchor) =>
      anchor.id === anchorId ? { ...anchor, ...changes } : anchor
    ),
  })
}

export function moveAnchorToTomorrow(anchorId) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const current = loadDayPlan(today)
  const moving = current.anchors.find((anchor) => anchor.id === anchorId)
  if (!moving) return current

  const next = loadDayPlan(tomorrow)
  saveDayPlan({
    ...next,
    rollover: [
      ...next.rollover.filter((item) => item.id !== anchorId),
      { ...moving, completed: false, startedAt: null, rolledFrom: current.date },
    ],
  }, tomorrow)

  return saveDayPlan({
    ...current,
    anchors: current.anchors.filter((anchor) => anchor.id !== anchorId),
  }, today)
}

// Every saved day plan, keyed by date. The Garden reads across days.
export function loadAllDayPlans() {
  return readPlans()
}

// Adds a task straight into tomorrow's candidates, so tonight's plan shows up
// in tomorrow's briefing instead of starting from a blank page.
export function addTaskForTomorrow(title) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const next = loadDayPlan(tomorrow)
  return saveDayPlan({
    ...next,
    candidates: [
      ...next.candidates,
      { id: `tonight-${Date.now()}`, title, source: 'manual' },
    ],
  }, tomorrow)
}

// ---------- Night reflection journal ----------
// One entry per day: { helped, hindered, remember, closedAt }.

const JOURNAL_KEY = 'anchor_journal_v1'

function readJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}')
  } catch (err) {
    console.error('Could not read the journal:', err)
    return {}
  }
}

export function loadJournalEntry(date = new Date()) {
  const key = typeof date === 'string' ? date : dayKey(date)
  return readJournal()[key] || null
}

// The whole journal, keyed by date — for "Past nights" and, later, Trends.
export function loadJournal() {
  return readJournal()
}

export function saveJournalEntry(changes, date = new Date()) {
  const key = typeof date === 'string' ? date : dayKey(date)
  const journal = readJournal()
  const entry = { ...journal[key], ...changes, date: key }
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ ...journal, [key]: entry }))
  } catch (err) {
    console.error('Could not save the journal:', err)
  }
  return entry
}

export function loadSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Could not read focus sessions:', err)
    return []
  }
}

export function saveSession(session) {
  const sessions = loadSessions()
  sessions.push(session)
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (err) {
    console.error('Could not save focus session:', err)
  }
  return sessions
}
