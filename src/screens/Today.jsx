import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditIcon, GripIcon, RepeatIcon, TrashIcon } from '../components/icons'
import SwipeRow from '../components/SwipeRow'
import { useFocusSession } from '../hooks/useFocusSession'
import {
  DUMP_KINDS,
  addDump,
  dayKey,
  loadDayPlan,
  loadDumps,
  moveAnchorToTomorrow,
  removeDump,
  removeTodayAnchor,
  restoreDump,
  saveDayPlan,
  saveDumpOrder,
  updateDump,
  updateTodayAnchor,
} from '../store'
import { nextFirstStep, suggestFirstStep } from '../firstSteps'
import { getWeekData } from './weekSampleData'

const MAX_ANCHORS = 3

// How each brain-dump tag reads on screen. The keys are the stored values.
const DUMP_LABELS = {
  task: 'Task',
  worry: 'Worry',
  idea: 'Idea',
  reminder: 'Reminder',
  feeling: 'Feeling',
  later: 'Later',
}

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

  // Brain dump. Its own notice rather than the one at the top of the screen —
  // an undo you can't see because it's three sections above you isn't an undo.
  const [dumps, setDumps] = useState(loadDumps)
  const [dumpText, setDumpText] = useState('')
  const [openDumpId, setOpenDumpId] = useState(null)
  const [dumpNotice, setDumpNotice] = useState(null) // { text, undo }
  // Reorder drag: the index the pointer currently holds, and the live order.
  // Both are refs because a drag reads them mid-gesture, between renders.
  const dragFrom = useRef(null)
  const dragOrder = useRef([])
  const [draggingId, setDraggingId] = useState(null)

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

  // ---------- brain dump ----------

  function addThought(event) {
    event.preventDefault()
    const text = dumpText.trim()
    if (!text) return
    setDumps(addDump(text))
    setDumpText('')
    setDumpNotice(null)
  }

  // Tapping the tag a thought already has clears it, so nothing is stuck in a
  // category you regret picking.
  function tagThought(entry, kind) {
    setDumps(updateDump(entry.id, { kind: entry.kind === kind ? null : kind }))
  }

  function clearThought(entry) {
    const index = dumps.findIndex((item) => item.id === entry.id)
    setDumps(removeDump(entry.id))
    setOpenDumpId(null)
    setDumpNotice({
      text: 'Cleared.',
      undo: () => {
        setDumps(restoreDump(entry, index))
        setDumpNotice(null)
      },
    })
  }

  // ---------- reordering the dump ----------
  // The drag lives on its own handle rather than on the row: the row is a tap
  // target that opens the tags, and one element can't be both without the two
  // gestures fighting each other. Pointer Events cover thumb and mouse in one
  // path, the same way SwipeRow does.

  function moveThought(from, to) {
    if (to < 0 || to >= dragOrder.current.length || to === from) return null
    const next = [...dragOrder.current]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    dragOrder.current = next
    setDumps(next)
    return next
  }

  function startDrag(event, index) {
    if (!event.isPrimary) return
    dragFrom.current = index
    dragOrder.current = dumps
    setDraggingId(dumps[index].id)
    setOpenDumpId(null) // a row shouldn't stay open while it's moving
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* pointer already gone */
    }
  }

  function dragOver(event) {
    if (dragFrom.current == null) return
    // Hit-test for the row under the finger. Row heights vary — long text
    // wraps — so this beats measuring positions once and working from a
    // snapshot that goes stale after the first swap.
    const over = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-dump-index]')
    if (!over) return

    const to = Number(over.dataset.dumpIndex)
    if (Number.isNaN(to)) return
    if (moveThought(dragFrom.current, to)) dragFrom.current = to
  }

  function endDrag(event) {
    if (dragFrom.current == null) return
    dragFrom.current = null
    setDraggingId(null)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* nothing captured */
    }
    // One write for the whole gesture, not one per row crossed.
    setDumps(saveDumpOrder(dragOrder.current.map((entry) => entry.id)))
  }

  function cancelDrag() {
    dragFrom.current = null
    setDraggingId(null)
    setDumps(loadDumps())
  }

  // Arrow keys do the same job without a pointer. React keys the rows by id,
  // so the focused handle moves with its row and stays focused.
  function nudgeThought(event, index) {
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
    if (!delta) return
    event.preventDefault()
    dragOrder.current = dumps
    const next = moveThought(index, index + delta)
    if (next) setDumps(saveDumpOrder(next.map((entry) => entry.id)))
  }

  // A thought that turned out to be a real task can become one of today's
  // three. This is the only reason the dump needs sorting at all — everything
  // else in here is allowed to just sit there.
  function makeAnchor(entry) {
    if (plan.anchors.length >= MAX_ANCHORS) return
    setPlan(saveDayPlan({
      ...plan,
      anchors: [
        ...plan.anchors,
        {
          id: `fromdump-${Date.now()}`,
          title: entry.text,
          firstStep: suggestFirstStep(entry.text, 'manual'),
          source: 'manual',
          completed: false,
          startedAt: null,
        },
      ],
    }))
    setDumps(removeDump(entry.id))
    setOpenDumpId(null)
    setDumpNotice({ text: `“${entry.text}” is one of today’s anchors now.`, undo: null })
  }

  const today = dayKey()
  const anchorIds = new Set(plan.anchors.map((anchor) => anchor.id))
  // "Due today" means an actual deadline, so a due time is required. That
  // keeps scanned email subjects out (they're inbox attention for the
  // briefing, not deadlines) and timeless intentions out (that's what the
  // anchors above are for). Anchors are also excluded to avoid double-listing.
  const dueToday = (week?.tasks || [])
    .filter(
      (task) =>
        task.date === today && task.dueTime && !task.completed && !anchorIds.has(task.id)
    )
    .sort((a, b) => a.dueTime.localeCompare(b.dueTime))
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

      {/* Brain dump. Last on the page on purpose: the three anchors are what
          today is about, and this is the place everything else can go so it
          stops competing with them. */}
      <section className="card today-dump">
        <p className="eyebrow">Brain dump</p>
        <p className="today-dump-help">
          Get it out of your head now. Sorting it is optional, and it can wait.
        </p>

        <form className="today-dump-add" onSubmit={addThought}>
          <input
            type="text"
            value={dumpText}
            placeholder="A task, a worry, an idea…"
            aria-label="Add to your brain dump"
            onChange={(event) => setDumpText(event.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={!dumpText.trim()}>
            Add
          </button>
        </form>

        {dumpNotice && (
          <div className="today-notice today-dump-notice" role="status">
            <span>{dumpNotice.text}</span>
            {dumpNotice.undo && (
              <button className="today-notice-undo" type="button" onClick={dumpNotice.undo}>
                Undo
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setDumpNotice(null)}
            >
              ×
            </button>
          </div>
        )}

        {dumps.length === 0 ? (
          <p className="today-dump-empty">
            Nothing here yet. This is the place for whatever you don’t want to keep holding.
          </p>
        ) : (
          <ul className="today-dump-list">
            {/* A new thought lands on top, and dragging a handle rewrites the
                order from there — so the list stays however you left it. */}
            {dumps.map((entry, index) => {
              const open = openDumpId === entry.id
              const lifted = draggingId === entry.id
              return (
                <li
                  key={entry.id}
                  data-dump-index={index}
                  className={[
                    'today-dump-item',
                    open ? 'open' : '',
                    lifted ? 'lifted' : '',
                  ].join(' ').trim()}
                >
                  <div className="today-dump-main">
                    <button
                      className="today-dump-handle"
                      type="button"
                      aria-label={`Reorder “${entry.text}”. Use the arrow keys, or drag.`}
                      onPointerDown={(event) => startDrag(event, index)}
                      onPointerMove={dragOver}
                      onPointerUp={endDrag}
                      onPointerCancel={cancelDrag}
                      onKeyDown={(event) => nudgeThought(event, index)}
                      onDragStart={(event) => event.preventDefault()}
                    >
                      <GripIcon size={14} />
                    </button>

                    {/* Tapping opens the tags and actions. The resting row stays
                        calm, and nothing that removes a thought is one stray tap
                        away — same reasoning as the anchor cards above. */}
                    <button
                      className="today-dump-row"
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenDumpId(open ? null : entry.id)}
                    >
                      <span className="today-dump-text">{entry.text}</span>
                      {entry.kind && (
                        <span className="today-dump-tag">{DUMP_LABELS[entry.kind]}</span>
                      )}
                    </button>
                  </div>

                  {open && (
                    <div className="today-dump-detail">
                      <div className="reflect-chips" role="group" aria-label={`Sort “${entry.text}”`}>
                        {DUMP_KINDS.map((kind) => (
                          <button
                            key={kind}
                            className={entry.kind === kind ? 'reflect-chip active' : 'reflect-chip'}
                            type="button"
                            aria-pressed={entry.kind === kind}
                            onClick={() => tagThought(entry, kind)}
                          >
                            {DUMP_LABELS[kind]}
                          </button>
                        ))}
                      </div>

                      <div className="today-dump-actions">
                        {plan.anchors.length < MAX_ANCHORS && (
                          <button
                            className="btn-ghost"
                            type="button"
                            onClick={() => makeAnchor(entry)}
                          >
                            Make it an anchor
                          </button>
                        )}
                        <button
                          className="today-dump-clear"
                          type="button"
                          onClick={() => clearThought(entry)}
                        >
                          <TrashIcon size={11} />
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
