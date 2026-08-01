// Sample week data for the This Week screen. — Reed
// TEMPORARY: Madison's real Gmail/Calendar layer (src/data/) replaces this.
// Keep the shape of getWeekData()'s return value the same when swapping.

import { loadAllDayPlans } from '../store'
import { suggestFirstStep } from '../firstSteps'

// Dates are generated relative to "today" so the screen always has live-looking data.
function dayOffset(offset) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
  }
  
  const TASKS = [
    { id: 't1', title: 'Reply to Prof. Hartmann about project demo', date: dayOffset(0), dueTime: '15:00', source: 'gmail',    completed: false, firstStep: 'Open the email and hit reply' },
    { id: 't2', title: 'CS160 implementation writeup outline',       date: dayOffset(0), dueTime: '20:00', source: 'manual',   completed: false, firstStep: 'Create the doc and paste the headers' },
    { id: 't3', title: 'Pay July rent',                              date: dayOffset(0), dueTime: '23:59', source: 'gmail',    completed: true,  firstStep: 'Open the payment portal' },
    { id: 't4', title: 'Submit work timesheet',                      date: dayOffset(1), dueTime: '12:00', source: 'gmail',    completed: false, firstStep: 'Open the timesheet link' },
    { id: 't5', title: 'Ship This Week screen',                      date: dayOffset(1), dueTime: '18:00', source: 'manual',   completed: false, firstStep: 'git pull and open ThisWeek.jsx' },
    { id: 't6', title: 'Read ch. 4 for exam',                        date: dayOffset(2), dueTime: '21:00', source: 'manual',   completed: false, firstStep: 'Open the PDF to page 61' },
    { id: 't7', title: 'RSVP to research group social',              date: dayOffset(3), dueTime: '17:00', source: 'gmail',    completed: false, firstStep: 'Open the invite and click yes/no' },
    { id: 't8', title: 'Notifications feature for Anchor',           date: dayOffset(3), dueTime: '19:00', source: 'manual',   completed: false, firstStep: 'Ask for notification permission on load' },
    { id: 't9', title: 'Problem set 6',                              date: dayOffset(4), dueTime: '23:59', source: 'calendar', completed: false, firstStep: 'Write your name on question 1' },
    { id: 't10', title: 'Testing report: 2 feature + 5 stress tests', date: dayOffset(4), dueTime: '20:00', source: 'manual',  completed: false, firstStep: 'Copy the report template' },
  ]
  
  const EVENTS = [
    { id: 'e1', title: 'CS160 lecture',            date: dayOffset(0), start: '10:00', end: '11:30', source: 'calendar' },
    { id: 'e2', title: 'Work shift',               date: dayOffset(1), start: '13:00', end: '17:00', source: 'calendar' },
    { id: 'e3', title: 'Team sync — Anchor',       date: dayOffset(2), start: '18:00', end: '18:30', source: 'calendar' },
    { id: 'e4', title: 'Midterm review session',   date: dayOffset(3), start: '16:00', end: '17:30', source: 'calendar' },
    { id: 'e5', title: 'CS160 lecture',            date: dayOffset(4), start: '10:00', end: '11:30', source: 'calendar' },
    { id: 'e6', title: 'Anchor M4 due',            date: dayOffset(4), start: '23:59', end: '23:59', source: 'calendar' },
  ]
  
  // Flip to true (or add ?fail to the URL) to preview the error state.
  const SIMULATE_ERROR = false

  // ---------- the user's week data ----------
  // The samples above are opt-in demo content, off by default — the week
  // starts as a blank page. Everything the user does lives in one diff layer:
  // whether samples are loaded, edits/deletions applied to them, and tasks
  // they added themselves. Diffs (rather than rewriting the list) keep the
  // samples' relative dates evergreen for demos.

  const WEEK_USER_KEY = 'anchor_week_overrides_v1'
  const EMPTY_USER_DATA = {
    samplesOn: false,
    edited: {},
    deleted: [],
    added: [],
    // Filled by the Google scans (data/googleData.js): unread mail as tasks,
    // calendar entries as events. Replaced wholesale on each rescan.
    importedTasks: [],
    importedEvents: [],
    scannedAt: null,
  }

  function readUserData() {
    try {
      const raw = localStorage.getItem(WEEK_USER_KEY)
      return raw ? { ...EMPTY_USER_DATA, ...JSON.parse(raw) } : { ...EMPTY_USER_DATA }
    } catch {
      return { ...EMPTY_USER_DATA }
    }
  }

  function writeUserData(data) {
    try {
      localStorage.setItem(WEEK_USER_KEY, JSON.stringify(data))
    } catch (err) {
      console.error('Could not save week task changes:', err)
    }
  }

  function userTasks() {
    const u = readUserData()
    // Edits and deletions apply to samples and imports alike, so a renamed or
    // dismissed email-task stays that way across rescans.
    const applyDiffs = (list) =>
      list
        .filter((t) => !u.deleted.includes(t.id))
        .map((t) => (u.edited[t.id] ? { ...t, ...u.edited[t.id] } : t))
    const samples = u.samplesOn ? applyDiffs(TASKS) : []
    return [...samples, ...applyDiffs(u.importedTasks), ...u.added]
  }

  export function samplesEnabled() {
    return readUserData().samplesOn
  }

  export function enableSamples() {
    writeUserData({ ...readUserData(), samplesOn: true })
  }

  export function disableSamples() {
    writeUserData({ ...readUserData(), samplesOn: false })
  }

  export function addWeekTask({ title, date, dueTime = '' }) {
    const u = readUserData()
    const task = {
      id: `u-${Date.now()}`,
      title,
      date,
      dueTime,
      source: 'manual',
      completed: false,
      firstStep: suggestFirstStep(title, 'manual'),
    }
    writeUserData({ ...u, added: [...u.added, task] })
    return task
  }

  // What the Google scans found. Wholesale replacement keeps rescans
  // idempotent; the user's edited/deleted diffs are keyed by id and survive.
  export function setImportedData({ tasks = [], events = [] }) {
    writeUserData({
      ...readUserData(),
      importedTasks: tasks,
      importedEvents: events,
      scannedAt: new Date().toISOString(),
    })
  }

  export function lastScannedAt() {
    return readUserData().scannedAt
  }

  // True for tasks owned by this module (samples, imports, user-added), as
  // opposed to planned anchors in the store — decides the write path.
  export function isWeekTask(id) {
    const u = readUserData()
    return (
      TASKS.some((t) => t.id === id) ||
      u.added.some((t) => t.id === id) ||
      u.importedTasks.some((t) => t.id === id)
    )
  }

  export function updateWeekTask(id, changes) {
    const u = readUserData()
    if (u.added.some((t) => t.id === id)) {
      writeUserData({
        ...u,
        added: u.added.map((t) => (t.id === id ? { ...t, ...changes } : t)),
      })
    } else {
      writeUserData({ ...u, edited: { ...u.edited, [id]: { ...u.edited[id], ...changes } } })
    }
  }

  // Returns the removed task so the caller's undo can hand it back.
  export function deleteWeekTask(id) {
    const u = readUserData()
    const added = u.added.find((t) => t.id === id)
    if (added) {
      writeUserData({ ...u, added: u.added.filter((t) => t.id !== id) })
      return added
    }
    const sample = userTasks().find((t) => t.id === id)
    if (!u.deleted.includes(id)) writeUserData({ ...u, deleted: [...u.deleted, id] })
    return sample
  }

  export function restoreWeekTask(task) {
    const u = readUserData()
    if (String(task.id).startsWith('u-')) {
      writeUserData({ ...u, added: [...u.added, task] })
    } else {
      writeUserData({ ...u, deleted: u.deleted.filter((x) => x !== task.id) })
    }
  }

  // Synchronous snapshot for refreshing a screen right after a mutation —
  // no fake latency, same shape as getWeekData resolves with.
  export function getWeekDataNow() {
    const u = readUserData()
    return {
      tasks: mergeWithPlanned(userTasks()),
      events: [...(u.samplesOn ? EVENTS : []), ...u.importedEvents],
    }
  }
  
  // Anchors you planned or postponed live in the store, not in the list above.
  // Without this they never reach This Week, so "Tomorrow" on a Today card
  // looked like it did nothing. Only gmail/calendar keep their own tag; an
  // anchor you moved is your own task, so it reads as "Added by you".
  function plannedTasks() {
    const plans = loadAllDayPlans()
    const out = []

    Object.values(plans).forEach((plan) => {
      const date = plan?.date
      if (!date) return
      ;[...(plan.anchors || []), ...(plan.rollover || [])].forEach((anchor) => {
        if (!anchor?.id) return
        const source = anchor.source === 'gmail' || anchor.source === 'calendar'
          ? anchor.source
          : 'manual'
        out.push({
          id: anchor.id,
          title: anchor.title,
          date,
          dueTime: '', // an intention for the day, not a deadline
          source,
          completed: Boolean(anchor.completed),
          firstStep: anchor.firstStep,
        })
      })
    })

    return out
  }

  // A task picked in the briefing is stored as "week-<sampleId>"; prefer that
  // copy so its completion state shows, and drop the sample it came from.
  function mergeWithPlanned(sampleTasks) {
    const planned = plannedTasks()
    const plannedIds = new Set(planned.map((t) => t.id))
    const shadowed = new Set(
      planned
        .map((t) => (String(t.id).startsWith('week-') ? String(t.id).slice(5) : null))
        .filter(Boolean)
    )

    const kept = sampleTasks.filter(
      (t) => !plannedIds.has(t.id) && !shadowed.has(String(t.id))
    )
    return [...kept, ...planned]
  }

  export function getWeekData() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const forceFail =
          SIMULATE_ERROR || window.location.href.includes('fail')
        if (forceFail) {
          reject(new Error('Could not load your week'))
        } else {
          resolve(getWeekDataNow())
        }
      }, 700) // fake network latency so the loading state is visible
    })
  }