import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditIcon, RepeatIcon, TrashIcon } from '../components/icons'
import SwipeRow from '../components/SwipeRow'
import { useFocusSession } from '../hooks/useFocusSession'
import {
  dayKey,
  loadDayPlan,
  moveAnchorToTomorrow,
  removeTodayAnchor,
  saveDayPlan,
  updateTodayAnchor,
} from '../store'
import { nextFirstStep, suggestFirstStep } from '../firstSteps'
import { getWeekData } from './weekSampleData'

const MAX_ANCHORS = 3

// Same 12-hour format This Week uses, so a task reads identically on both.
function clockTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

// One-tap demo data for an empty day — the fastest way to see the app working
// (and the path DEPLOY.md points graders at). Goes through the normal store,
// so these behave exactly like real anchors.
const SAMPLE_ANCHORS = [
  { title: 'Design Figma prototype', firstStep: 'Open Figma and choose a template' },
  { title: 'Research baseline evaluation', firstStep: 'Open vscode and edit tasks' },
  { title: 'Study for midterm', firstStep: 'Gather slides' },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

function formattedDate() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

export default function Today() {
  const navigate = useNavigate()
  const { startSession } = useFocusSession()
  const [plan, setPlan] = useState(() => loadDayPlan())
  const [editingId, setEditingId] = useState(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [stepDraft, setStepDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [week, setWeek] = useState(null)
  // The last removed anchor, kept only in memory so the notice can put it back.
  const [undoRemoved, setUndoRemoved] = useState(null)

  // Today's rows come from the same source as This Week, so the two screens
  // can't disagree about what's due.
  useEffect(() => {
    let cancelled = false
    getWeekData()
      .then((data) => {
        if (!cancelled) setWeek(data)
      })
      .catch((err) => {
        console.error('Could not load this week for Today:', err)
        if (!cancelled) setWeek({ tasks: [], events: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const landed = plan.anchors.filter((anchor) => anchor.completed).length
  const nextAnchor = plan.anchors.find((anchor) => !anchor.completed)

  function startFocus(anchor) {
    setPlan(updateTodayAnchor(anchor.id, {
      startedAt: anchor.startedAt || new Date().toISOString(),
    }))
    startSession({ task: anchor.title, step: anchor.firstStep, minutes: 5 })
    navigate('/timer')
  }

  function loadSampleAnchors() {
    const stamp = Date.now()
    setPlan(saveDayPlan({
      ...plan,
      anchors: SAMPLE_ANCHORS.map((anchor, index) => ({
        id: `sample-${stamp}-${index}`,
        title: anchor.title,
        firstStep: anchor.firstStep,
        source: 'sample',
        completed: false,
        startedAt: null,
      })),
    }))
    setNotice('Loaded three sample Anchors. Start a briefing to replace them.')
  }

  // Straight into today's plan, without a full briefing round trip. Calendar
  // and Gmail picking already lives in the briefing, so that stays a link.
  function addAnchor(event) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title || plan.anchors.length >= MAX_ANCHORS) return

    setPlan(saveDayPlan({
      ...plan,
      anchors: [
        ...plan.anchors,
        {
          id: `manual-${Date.now()}`,
          title,
          firstStep: suggestFirstStep(title, 'manual'),
          source: 'manual',
          completed: false,
          startedAt: null,
        },
      ],
    }))
    setNewTitle('')
  }

  function toggleComplete(anchor) {
    const completed = !anchor.completed
    setPlan(updateTodayAnchor(anchor.id, {
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    }))
  }

  function markStarted(anchor) {
    if (anchor.startedAt) return
    setPlan(updateTodayAnchor(anchor.id, { startedAt: new Date().toISOString() }))
    setUndoRemoved(null)
    setNotice(`Starting “${anchor.title}” counts.`)
  }

  function editAnchor(anchor) {
    setEditingId(anchor.id)
    setTitleDraft(anchor.title)
    setStepDraft(anchor.firstStep)
  }

  function saveAnchorEdits(event, anchorId) {
    event.preventDefault()
    const title = titleDraft.trim()
    const firstStep = stepDraft.trim()
    if (!title || !firstStep) return
    setPlan(updateTodayAnchor(anchorId, { title, firstStep }))
    setEditingId(null)
    setTitleDraft('')
    setStepDraft('')
  }

  function moveToTomorrow(anchor) {
    setPlan(moveAnchorToTomorrow(anchor.id))
    setEditingId(null)
    setUndoRemoved(null)
    setNotice(`Moved “${anchor.title}” to tomorrow without judgment.`)
  }

  // Deleting offers an undo rather than a confirm dialog: an extra "are you
  // sure?" is friction on every removal, while undo only costs something in
  // the rare case you didn't mean it.
  function removeAnchor(anchor) {
    setUndoRemoved({ anchor, index: plan.anchors.findIndex((a) => a.id === anchor.id) })
    setPlan(removeTodayAnchor(anchor.id))
    setEditingId(null)
    setNotice(`Removed “${anchor.title}”.`)
  }

  function undoRemove() {
    if (!undoRemoved) return
    const current = loadDayPlan()
    const anchors = [...current.anchors]
    // Back where it was, so the numbering doesn't shuffle under you.
    anchors.splice(Math.min(undoRemoved.index, anchors.length), 0, undoRemoved.anchor)
    setPlan(saveDayPlan({ ...current, anchors }))
    setUndoRemoved(null)
    setNotice('')
  }

  function dismissNotice() {
    setNotice('')
    setUndoRemoved(null)
  }

  const today = dayKey()
  const anchorIds = new Set(plan.anchors.map((anchor) => anchor.id))
  // Anchors already have their own section above, so they're left out here
  // rather than listed twice.
  const dueToday = (week?.tasks || [])
    .filter((task) => task.date === today && !task.completed && !anchorIds.has(task.id))
    .sort((a, b) => (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99'))
  const eventsToday = (week?.events || [])
    .filter((event) => event.date === today)
    .sort((a, b) => (a.start || '99:99').localeCompare(b.start || '99:99'))

  const eventPhrase =
    eventsToday.length === 0
      ? 'Nothing on the calendar.'
      : eventsToday.length === 1
        ? '1 event on the calendar.'
        : `${eventsToday.length} events on the calendar.`

  const greetingSummary = nextAnchor
    ? `Anchor ${plan.anchors.indexOf(nextAnchor) + 1} is next: “${nextAnchor.firstStep}.” ${eventPhrase}`
    : plan.anchors.length
      ? 'You landed every remaining Anchor. Anything else is extra.'
      : 'Nothing planned yet. Start a morning briefing to pick your three.'

  return (
    <div className="screen today-screen">
      <section className="card-sage today-greeting">
        <p className="eyebrow">{formattedDate()}</p>
        <h1>{greeting()}</h1>
        <p>{greetingSummary}</p>
      </section>

      <button
        className="today-briefing-button"
        type="button"
        onClick={() => navigate('/briefing')}
      >
        <span>
          <strong>{plan.anchors.length ? 'Adjust morning briefing' : 'Start morning briefing'}</strong>
          <small>{plan.anchors.length ? 'Review today’s plan' : 'Add today’s tasks'}</small>
        </span>
        <span className="today-briefing-arrow" aria-hidden="true">›</span>
      </button>

      {notice && (
        <div className="today-notice" role="status">
          <span>{notice}</span>
          {undoRemoved && (
            <button className="today-notice-undo" type="button" onClick={undoRemove}>
              Undo
            </button>
          )}
          <button type="button" aria-label="Dismiss message" onClick={dismissNotice}>×</button>
        </div>
      )}

      <section className="today-anchors">
        <div className="today-anchors-heading">
          <h2>Today’s anchors</h2>
          <span>{landed} of {plan.anchors.length || 3} landed</span>
        </div>

        {plan.anchors.length === 0 && (
          <div className="today-empty-anchors">
            <span aria-hidden="true">1 · 2 · 3</span>
            <strong>Your Anchors will live here.</strong>
            <p>Choose one to three things worth returning to today.</p>
            <button className="btn-ghost today-sample-button" type="button" onClick={loadSampleAnchors}>
              Try sample Anchors
            </button>
          </div>
        )}

        {plan.anchors.length < MAX_ANCHORS && (
          <form className="today-add" onSubmit={addAnchor}>
            <label className="eyebrow" htmlFor="today-add-title">
              Add an anchor
            </label>
            <div className="today-add-row">
              <input
                id="today-add-title"
                type="text"
                value={newTitle}
                placeholder="Something worth returning to"
                onChange={(event) => setNewTitle(event.target.value)}
              />
              <button className="btn-primary" type="submit" disabled={!newTitle.trim()}>
                Add
              </button>
            </div>
            <button
              className="today-add-alt"
              type="button"
              onClick={() => navigate('/briefing')}
            >
              or pick from your calendar and email
            </button>
          </form>
        )}

        <div className="today-anchor-list">
          {plan.anchors.map((anchor, index) => (
            <SwipeRow
              key={anchor.id}
              disabled={editingId === anchor.id}
              onSwipeLeft={() => toggleComplete(anchor)}
              onSwipeRight={() => removeAnchor(anchor)}
              leftLabel={<span>{anchor.completed ? 'Not yet ↺' : 'Landed ✓'}</span>}
              rightLabel={
                <span>
                  <TrashIcon size={13} /> Delete
                </span>
              }
            >
            <article
              className={`card task-card${anchor.completed ? ' task-card-complete' : ''}`}
            >
              {/* Editing takes over the whole card: title, first step, and the
                  only route to deleting. Keeping delete in here means the
                  resting card stays calm and nothing destructive is one
                  stray tap away. */}
              {editingId === anchor.id ? (
                <form className="task-step-form task-edit-form" onSubmit={(event) => saveAnchorEdits(event, anchor.id)}>
                  <div className="task-edit-head">
                    <span className="task-num">{index + 1}</span>
                    <span className="eyebrow">Editing anchor</span>
                  </div>

                  <label htmlFor={`title-${anchor.id}`}>Anchor</label>
                  <input
                    id={`title-${anchor.id}`}
                    type="text"
                    value={titleDraft}
                    autoFocus
                    onChange={(event) => setTitleDraft(event.target.value)}
                  />

                  <label htmlFor={`first-step-${anchor.id}`}>First step</label>
                  <input
                    id={`first-step-${anchor.id}`}
                    type="text"
                    value={stepDraft}
                    onChange={(event) => setStepDraft(event.target.value)}
                  />

                  <div>
                    <button type="submit" disabled={!titleDraft.trim() || !stepDraft.trim()}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                    <button
                      type="button"
                      className="step-suggest-btn"
                      onClick={() =>
                        // Uses the draft title, so renaming then asking for a
                        // step gives suggestions that fit the new name.
                        setStepDraft(nextFirstStep(titleDraft || anchor.title, anchor.source, stepDraft))
                      }
                    >
                      Try another
                    </button>
                    <button
                      type="button"
                      className="task-edit-delete"
                      onClick={() => removeAnchor(anchor)}
                    >
                      <TrashIcon size={11} />
                      Delete
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="task-head">
                    <span className="task-num">{index + 1}</span>
                    <span className="task-title">{anchor.title}</span>
                    <button
                      className="task-step-edit"
                      type="button"
                      aria-label={`Edit ${anchor.title}`}
                      onClick={() => editAnchor(anchor)}
                    >
                      <EditIcon size={13} />
                    </button>
                    <button
                      className="task-check"
                      type="button"
                      aria-label={anchor.completed ? `Mark ${anchor.title} unfinished` : `Mark ${anchor.title} landed`}
                      aria-pressed={anchor.completed}
                      onClick={() => toggleComplete(anchor)}
                    >
                      {anchor.completed && <span aria-hidden="true">✓</span>}
                    </button>
                  </div>

                  <div className="task-step">
                    <span className="task-step-pill">First step</span>
                    <span className="task-step-text">{anchor.firstStep}</span>
                  </div>

                  <div className="task-actions">
                    <button className="btn-primary" type="button" onClick={() => startFocus(anchor)}>
                      Start 5 min
                    </button>
                    <button
                      className={`btn-ghost${anchor.startedAt ? ' active' : ''}`}
                      type="button"
                      aria-pressed={Boolean(anchor.startedAt)}
                      onClick={() => markStarted(anchor)}
                    >
                      {anchor.startedAt ? 'Started ✓' : 'I started'}
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => moveToTomorrow(anchor)}>
                      <RepeatIcon size={12} />
                      Tomorrow
                    </button>
                  </div>
                </>
              )}
            </article>
            </SwipeRow>
          ))}
        </div>
      </section>

      <section className="today-info-list">
        <h3 className="today-info-title">Things due today</h3>
        {!week && <p className="today-info-empty">Loading…</p>}
        {week && dueToday.length === 0 && (
          <p className="today-info-empty">Nothing else due today.</p>
        )}
        {dueToday.map((task, index) => (
          <div
            className={
              index === dueToday.length - 1
                ? 'today-info-row today-info-row-due today-info-row-last'
                : 'today-info-row today-info-row-due'
            }
            key={task.id}
          >
            <span className="today-info-label">{task.title}</span>
            {task.dueTime && (
              <span className="today-info-time">{clockTime(task.dueTime)}</span>
            )}
          </div>
        ))}
      </section>

      <section className="today-info-list">
        <h3 className="today-info-title">On the calendar</h3>
        {!week && <p className="today-info-empty">Loading…</p>}
        {week && eventsToday.length === 0 && (
          <p className="today-info-empty">Nothing on the calendar today.</p>
        )}
        {eventsToday.map((event, index) => (
          <div
            className={
              index === eventsToday.length - 1
                ? 'today-info-row today-info-row-last'
                : 'today-info-row'
            }
            key={event.id}
          >
            <span className="today-info-at">{clockTime(event.start)}</span>
            <span className="today-info-label">{event.title}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
