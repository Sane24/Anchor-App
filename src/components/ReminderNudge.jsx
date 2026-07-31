import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dismissReminder, passedReminders, subscribe } from '../notifications'
import { loadDayPlan, loadJournalEntry } from '../store'

// The catch-up layer. A browser tab can't notify you while it's closed, so the
// reminder that actually lands is this one: when you next open Anchor after a
// window has passed, and the ritual is still undone, it's waiting here.
//
// It checks the real data rather than just the clock — no point nagging about
// the morning briefing when you already picked your anchors at 7am.

function stillUndone(kind) {
  if (kind === 'morning') return loadDayPlan().anchors.length === 0
  return !loadJournalEntry()?.closedAt
}

export default function ReminderNudge() {
  const [, force] = useState(0)
  useEffect(() => subscribe(() => force((n) => n + 1)), [])

  // Latest window first, so at 10pm you're asked to close the day rather than
  // to start a briefing that's twelve hours stale.
  const due = passedReminders().filter((reminder) => stillUndone(reminder.kind)).pop()
  if (!due) return null

  return (
    <div className="reminder-nudge" role="status">
      <span className="reminder-nudge-text">
        <strong>{due.title}</strong>
        <small>{due.body}</small>
      </span>
      <Link className="reminder-nudge-go" to={due.to} onClick={() => dismissReminder(due.kind)}>
        {due.action}
      </Link>
      <button
        className="reminder-nudge-close"
        type="button"
        aria-label={`Dismiss ${due.title} reminder`}
        onClick={() => dismissReminder(due.kind)}
      >
        ×
      </button>
    </div>
  )
}
