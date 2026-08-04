// Local persistence. localStorage is the source of truth — the app works
// fully signed-out. When someone is signed in, sync.js registers a write hook
// here so every local save also mirrors to their account.

const SESSIONS_KEY = 'anchor_focus_sessions'
const DAILY_PLANS_KEY = 'anchor_daily_plans_v1'
const LEGACY_TODAY_KEY = 'anchor_today_tasks'

// ---------- Optional sync layer ----------
// sync.js registers rather than being imported, so the store never depends on
// it (no circular import, and the app runs with sync entirely absent).

let writeHook = null

export function setWriteHook(fn) {
  writeHook = fn
}

function afterWrite(kind, payload) {
  try {
    writeHook?.(kind, payload)
  } catch (err) {
    console.error('Sync hook failed:', err)
  }
}

// Screens can subscribe to hear about out-of-band changes (a sync pull
// replacing collections) and re-read.

const storeSubscribers = new Set()

export function subscribeToStore(fn) {
  storeSubscribers.add(fn)
  return () => storeSubscribers.delete(fn)
}

export function notifyStoreChanged() {
  storeSubscribers.forEach((fn) => {
    try {
      fn()
    } catch (err) {
      console.error('Store subscriber failed:', err)
    }
  })
}

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
  afterWrite('day_plan', saved)
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

// Edit an item on any day's plan — This Week's detail dialog reaches items on
// future dates. Patches whichever list holds it (anchors or rollover).
export function updatePlanItem(date, itemId, changes) {
  const plan = loadDayPlan(date)
  const patch = (list) => list.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
  return saveDayPlan({ ...plan, anchors: patch(plan.anchors), rollover: patch(plan.rollover) }, date)
}

// Puts a removed item back on its day (undo for removePlanItem). It returns
// to the anchors list regardless of origin — same day, same display.
export function restorePlanItem(date, item) {
  const plan = loadDayPlan(date)
  if (plan.anchors.some((a) => a.id === item.id) || plan.rollover.some((r) => r.id === item.id)) {
    return plan
  }
  return saveDayPlan({ ...plan, anchors: [...plan.anchors, item] }, date)
}

// Remove an item from any day's plan. Callers offer undo, not a confirm.
export function removePlanItem(date, itemId) {
  const plan = loadDayPlan(date)
  const drop = (list) => list.filter((item) => item.id !== itemId)
  return saveDayPlan({ ...plan, anchors: drop(plan.anchors), rollover: drop(plan.rollover) }, date)
}

// Drops an anchor from today entirely — unlike moveAnchorToTomorrow it isn't
// carried anywhere, so callers should offer an undo (Today re-adds the object
// it held onto) rather than a confirm dialog.
export function removeTodayAnchor(anchorId) {
  const current = loadDayPlan()
  return saveDayPlan({
    ...current,
    anchors: current.anchors.filter((anchor) => anchor.id !== anchorId),
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

function writeJournal(journal) {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal))
  } catch (err) {
    console.error('Could not save the journal:', err)
  }
}

export function saveJournalEntry(changes, date = new Date()) {
  const key = typeof date === 'string' ? date : dayKey(date)
  const journal = readJournal()
  // updatedAt lets the sync merge pick the newer copy of a night.
  const entry = { ...journal[key], ...changes, date: key, updatedAt: new Date().toISOString() }
  writeJournal({ ...journal, [key]: entry })
  afterWrite('journal', entry)
  return entry
}

// ---------- Brain dump ----------
// One always-open place to get a thought out of your head. Capture asks for
// nothing but the text — naming it a task or a worry is optional, and can
// happen later or never. Sorting is friction, and friction is what stops the
// thought leaving your head at all.
//
// Stored in the order it's shown. A new thought goes on top, and dragging a
// row rewrites this array — so the list is whatever order you last left it in,
// and an undo can put a cleared thought back exactly where it was.
//
// afterWrite fires with kind 'dump', which sync.js has no branch for yet — it
// ignores unknown kinds, so the dump stays on this device until a table exists.

const DUMP_KEY = 'anchor_braindump_v1'

export const DUMP_KINDS = ['task', 'worry', 'idea', 'reminder', 'feeling', 'later']

function readDumps() {
  try {
    const raw = localStorage.getItem(DUMP_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.error('Could not read the brain dump:', err)
    return []
  }
}

function writeDumps(dumps) {
  try {
    localStorage.setItem(DUMP_KEY, JSON.stringify(dumps))
  } catch (err) {
    console.error('Could not save the brain dump:', err)
  }
}

export function loadDumps() {
  return readDumps()
}

export function addDump(text) {
  const entry = {
    id: `dump-${Date.now()}`,
    text,
    kind: null,
    createdAt: new Date().toISOString(),
  }
  const dumps = [entry, ...readDumps()]
  writeDumps(dumps)
  afterWrite('dump', entry)
  return dumps
}

// Commits a reordered list. The screen shuffles rows live while a drag is in
// flight and calls this once on drop, so dragging across five rows is one
// write rather than five. Takes ids rather than whole entries so a stale
// screen can only reorder what's already saved, never resurrect or edit it.
export function saveDumpOrder(orderedIds) {
  const current = readDumps()
  const byId = new Map(current.map((entry) => [entry.id, entry]))
  const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean)
  const placed = new Set(ordered.map((entry) => entry.id))
  // Anything the screen didn't know about (added in another tab) keeps its
  // place at the end instead of being dropped.
  const next = [...ordered, ...current.filter((entry) => !placed.has(entry.id))]
  writeDumps(next)
  return next
}

export function updateDump(id, changes) {
  const dumps = readDumps().map((entry) =>
    entry.id === id ? { ...entry, ...changes } : entry
  )
  writeDumps(dumps)
  const updated = dumps.find((entry) => entry.id === id)
  if (updated) afterWrite('dump', updated)
  return dumps
}

export function removeDump(id) {
  const dumps = readDumps().filter((entry) => entry.id !== id)
  writeDumps(dumps)
  return dumps
}

// Puts a cleared thought back where it was. Callers offer this as undo rather
// than asking "are you sure?" before every clear.
export function restoreDump(entry, index) {
  const dumps = readDumps()
  if (dumps.some((item) => item.id === entry.id)) return dumps
  dumps.splice(Math.min(index, dumps.length), 0, entry)
  writeDumps(dumps)
  return dumps
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

function writeSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (err) {
    console.error('Could not save focus session:', err)
  }
}

export function saveSession(session) {
  const sessions = loadSessions()
  sessions.push(session)
  writeSessions(sessions)
  afterWrite('session', session)
  return sessions
}

// Used by the sync layer after a pull: swap in the merged collections
// wholesale, then let screens know to re-read. Not for screen code.
export function replaceCollections({ plans, journal, sessions }) {
  if (plans) writePlans(plans)
  if (journal) writeJournal(journal)
  if (sessions) writeSessions(sessions)
  notifyStoreChanged()
}
