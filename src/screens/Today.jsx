import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditIcon, RepeatIcon } from '../components/icons'
import { useFocusSession } from '../hooks/useFocusSession'
import {
  loadDayPlan,
  moveAnchorToTomorrow,
  updateTodayAnchor,
} from '../store'

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
  const [stepDraft, setStepDraft] = useState('')
  const [notice, setNotice] = useState('')

  const landed = plan.anchors.filter((anchor) => anchor.completed).length
  const nextAnchor = plan.anchors.find((anchor) => !anchor.completed)

  function startFocus(anchor) {
    setPlan(updateTodayAnchor(anchor.id, {
      startedAt: anchor.startedAt || new Date().toISOString(),
    }))
    startSession({ task: anchor.title, step: anchor.firstStep, minutes: 5 })
    navigate('/timer')
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
    setNotice(`Starting “${anchor.title}” counts.`)
  }

  function editFirstStep(anchor) {
    setEditingId(anchor.id)
    setStepDraft(anchor.firstStep)
  }

  function saveFirstStep(event, anchorId) {
    event.preventDefault()
    const firstStep = stepDraft.trim()
    if (!firstStep) return
    setPlan(updateTodayAnchor(anchorId, { firstStep }))
    setEditingId(null)
    setStepDraft('')
  }

  function moveToTomorrow(anchor) {
    setPlan(moveAnchorToTomorrow(anchor.id))
    setEditingId(null)
    setNotice(`Moved “${anchor.title}” to tomorrow without judgment.`)
  }

  const greetingSummary = nextAnchor
    ? `Anchor ${plan.anchors.indexOf(nextAnchor) + 1} is next: “${nextAnchor.firstStep}.” 2 events on the calendar.`
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
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>
        </div>
      )}

      <section className="today-anchors">
        <div className="today-anchors-heading">
          <h2>Today’s anchors</h2>
          <span>{landed} of 3 landed</span>
        </div>

        {plan.anchors.length === 0 && (
          <div className="today-empty-anchors">
            <span aria-hidden="true">1 · 2 · 3</span>
            <strong>Your Anchors will live here.</strong>
            <p>Choose three things worth returning to today.</p>
          </div>
        )}

        <div className="today-anchor-list">
          {plan.anchors.map((anchor, index) => (
            <article
              className={`card task-card${anchor.completed ? ' task-card-complete' : ''}`}
              key={anchor.id}
            >
              <div className="task-head">
                <span className="task-num">{index + 1}</span>
                <span className="task-title">{anchor.title}</span>
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

              {editingId === anchor.id ? (
                <form className="task-step-form" onSubmit={(event) => saveFirstStep(event, anchor.id)}>
                  <label htmlFor={`first-step-${anchor.id}`}>First step</label>
                  <input
                    id={`first-step-${anchor.id}`}
                    type="text"
                    value={stepDraft}
                    autoFocus
                    onChange={(event) => setStepDraft(event.target.value)}
                  />
                  <div>
                    <button type="submit" disabled={!stepDraft.trim()}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="task-step">
                  <span className="task-step-pill">First step</span>
                  <span className="task-step-text">{anchor.firstStep}</span>
                  <button
                    className="task-step-edit"
                    type="button"
                    aria-label={`Edit first step for ${anchor.title}`}
                    onClick={() => editFirstStep(anchor)}
                  >
                    <EditIcon size={13} />
                  </button>
                </div>
              )}

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
            </article>
          ))}
        </div>
      </section>

      <section className="today-info-list">
        <h3 className="today-info-title">Things due today</h3>
        <div className="today-info-row today-info-row-due">
          <span className="today-info-label">CS160 PA#2</span>
          <span className="today-info-time">11:59 PM</span>
        </div>
        <div className="today-info-row today-info-row-due">
          <span className="today-info-label">Essay outline</span>
          <span className="today-info-time">5:00 PM</span>
        </div>
        <div className="today-info-row today-info-row-due today-info-row-last">
          <span className="today-info-label">Reply to research email</span>
        </div>
      </section>

      <section className="today-info-list">
        <h3 className="today-info-title">On the calendar</h3>
        <div className="today-info-row">
          <span className="today-info-at">2:00 PM</span>
          <span className="today-info-label">Research meeting</span>
        </div>
        <div className="today-info-row today-info-row-last">
          <span className="today-info-at">5:30 PM</span>
          <span className="today-info-label">Gym</span>
        </div>
      </section>
    </div>
  )
}
