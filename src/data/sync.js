// Cross-device sync, local-first. localStorage stays the source of truth and
// the app never waits on the network: while someone is signed in, local writes
// mirror up to Supabase in the background, and signing in pulls their account
// data down and merges it with whatever this device already has (so a week of
// anonymous use becomes theirs, not lost). Signing out just stops mirroring —
// local data is left alone.
//
// Every failure here is swallowed on purpose. Sync going wrong must never
// break the local app.

import { supabase } from '../lib/supabaseClient'
import {
  loadAllDayPlans,
  loadJournal,
  loadSessions,
  notifyStoreChanged,
  replaceCollections,
  setWriteHook,
} from '../store'

let userId = null
let pulledFor = null // guards against double pulls (getSession + INITIAL_SESSION)

function warn(label, error) {
  if (error) console.warn(`Sync: ${label} failed —`, error.message || error)
}

async function pushDayPlan(plan) {
  if (!userId) return
  const { error } = await supabase.from('day_plans').upsert({
    user_id: userId,
    date: plan.date,
    plan,
    updated_at: plan.updatedAt || new Date().toISOString(),
  })
  warn('day plan push', error)
}

async function pushJournalEntry(entry) {
  if (!userId) return
  const { error } = await supabase.from('journal_entries').upsert({
    user_id: userId,
    date: entry.date,
    entry,
    updated_at: entry.updatedAt || new Date().toISOString(),
  })
  warn('journal push', error)
}

async function pushSession(session) {
  if (!userId || !session.id) return
  const { error } = await supabase.from('focus_sessions').upsert({
    user_id: userId,
    id: session.id,
    session,
  })
  warn('session push', error)
}

// Mirror local writes while signed in. Registered once at module load;
// signed out, the hook is a no-op and the store behaves as if we don't exist.
setWriteHook((kind, payload) => {
  if (kind === 'day_plan') pushDayPlan(payload)
  else if (kind === 'journal') pushJournalEntry(payload)
  else if (kind === 'session') pushSession(payload)
})

// Newer updatedAt wins; a tie (or missing stamps) keeps what this device has.
function newerOf(local, remote) {
  if (!local) return remote
  if (!remote) return local
  return (remote.updatedAt || '') > (local.updatedAt || '') ? remote : local
}

export async function pullAndMerge(id) {
  if (!id) return
  userId = id
  if (pulledFor === id) return
  pulledFor = id

  try {
    const [plansRes, journalRes, sessionsRes] = await Promise.all([
      supabase.from('day_plans').select('date, plan'),
      supabase.from('journal_entries').select('date, entry'),
      supabase.from('focus_sessions').select('id, session'),
    ])
    const error = plansRes.error || journalRes.error || sessionsRes.error
    if (error) {
      warn('pull', error)
      pulledFor = null // let a later sign-in retry
      return
    }

    // Day plans and journal merge per date, newest updatedAt winning.
    const plans = { ...loadAllDayPlans() }
    for (const row of plansRes.data) {
      plans[row.date] = newerOf(plans[row.date], row.plan)
    }

    const journal = { ...loadJournal() }
    for (const row of journalRes.data) {
      journal[row.date] = newerOf(journal[row.date], row.entry)
    }

    // Sessions are append-only: union by id, kept in time order so
    // "recent sprints" still means something.
    const sessionsById = new Map(loadSessions().map((s) => [s.id, s]))
    for (const row of sessionsRes.data) {
      if (!sessionsById.has(row.id)) sessionsById.set(row.id, row.session)
    }
    const sessions = [...sessionsById.values()].sort((a, b) =>
      (a.startedAt || '').localeCompare(b.startedAt || '')
    )

    replaceCollections({ plans, journal, sessions })

    // Send the merged result back up so this device's pre-account work (and
    // anything newer here) lands in the account. One row per day — small.
    await Promise.all([
      ...Object.values(plans).map(pushDayPlan),
      ...Object.values(journal).map(pushJournalEntry),
      ...sessions.map(pushSession),
    ])
  } catch (err) {
    warn('pull', err)
    pulledFor = null
  }
}

// Sign-out: stop mirroring, keep local data. Signing back in re-syncs.
export function clearSyncUser() {
  userId = null
  pulledFor = null
}
