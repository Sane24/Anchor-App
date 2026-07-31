import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addWeekTask,
  deleteWeekTask,
  enableSamples,
  disableSamples,
  samplesEnabled,
  getWeekData,
  getWeekDataNow,
  isWeekTask,
  restoreWeekTask,
  updateWeekTask,
} from './weekSampleData'
import { removePlanItem, restorePlanItem, updatePlanItem } from '../store'
import '../styles/week.css'

// date helpers

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Where a day heading settles when you jump to it — clears the sticky strip.
// Keep in sync with --week-jump-offset in week.css.
const JUMP_OFFSET = 92

function toKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nextSevenDays() {
  const days = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push({ key: toKey(d), date: d })
  }
  return days
}

function dayLabel(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date - today) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'long' })
}

function monthDay(date) {
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

function scrollStyle() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

const SOURCE_LABEL = { gmail: 'Gmail', calendar: 'Calendar', manual: 'Added by you' }

// screen

export default function ThisWeek() {
  const days = useMemo(nextSevenDays, [])
  const [activeKey, setActiveKey] = useState(days[0].key)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [detailTask, setDetailTask] = useState(null)
  const [detailMode, setDetailMode] = useState('view') // view | edit
  const [draft, setDraft] = useState({ title: '', firstStep: '', dueTime: '', date: '' })
  // { text, undo } — undo restores whatever was just deleted.
  const [notice, setNotice] = useState(null)
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [newTask, setNewTask] = useState(() => ({ title: '', date: days[0].key }))

  // The whole week is on the page at once; these let the strip jump to a day
  // and let the scroll position say which chip is current.
  const sectionRefs = useRef({})
  const stripRef = useRef(null)

  function load() {
    setStatus('loading')
    getWeekData()
      .then((d) => {
        setData(d)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

  useEffect(load, [])

  const tasksByDay = useMemo(() => {
    const map = {}
    if (!data) return map
    for (const t of data.tasks) (map[t.date] ||= []).push(t)
    // Anchors carry no due time, so they sort after the timed items instead of
    // throwing on an undefined dueTime.
    const at = (t) => t.dueTime || '99:99'
    for (const k in map) map[k].sort((a, b) => at(a).localeCompare(at(b)))
    return map
  }, [data])

  const eventsByDay = useMemo(() => {
    const map = {}
    if (!data) return map
    for (const e of data.events) (map[e.date] ||= []).push(e)
    for (const k in map) map[k].sort((a, b) => a.start.localeCompare(b.start))
    return map
  }, [data])

  const openCount = (key) =>
    (tasksByDay[key] || []).filter((t) => !t.completed).length

  // Highlight the day you're actually looking at: the last heading that has
  // passed under the strip wins.
  useEffect(() => {
    if (status !== 'ready') return undefined
    let frame = 0

    function measure() {
      frame = 0
      const marker = JUMP_OFFSET + 12
      let current = days[0].key
      for (const { key } of days) {
        const top = sectionRefs.current[key]?.getBoundingClientRect().top
        if (top != null && top <= marker) current = key
      }
      setActiveKey(current)
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [status, days])

  // Keep the current chip in view as the week scrolls past it. Only moves when
  // the chip would be off-screen, so the strip doesn't drift while you read.
  useEffect(() => {
    const strip = stripRef.current
    const chip = strip?.querySelector(`[data-day="${activeKey}"]`)
    if (!strip || !chip) return

    const left = chip.offsetLeft - strip.scrollLeft
    if (left >= 0 && left + chip.offsetWidth <= strip.clientWidth) return

    strip.scrollTo({
      left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2,
      behavior: scrollStyle(),
    })
  }, [activeKey])

  const jumpToDay = useCallback((key) => {
    setActiveKey(key)
    sectionRefs.current[key]?.scrollIntoView({ behavior: scrollStyle(), block: 'start' })
  }, [])

  function closeDetail() {
    setDetailTask(null)
    setDetailMode('view')
  }

  // Mirrors Today's "Try sample Anchors": demo data is opt-in, one tap,
  // and just as easy to take back.
  function loadSamples() {
    enableSamples()
    setData(getWeekDataNow())
    setNotice({
      text: 'Loaded a sample week. Your own tasks are untouched.',
      undo: () => {
        disableSamples()
        setData(getWeekDataNow())
        setNotice(null)
      },
    })
  }

  function addOwnTask(event) {
    event.preventDefault()
    const title = newTask.title.trim()
    if (!title) return
    addWeekTask({ title, date: newTask.date })
    setData(getWeekDataNow())
    setNewTask({ title: '', date: days[0].key })
  }

  function openEdit() {
    setDraft({
      title: detailTask.title,
      firstStep: detailTask.firstStep || '',
      dueTime: detailTask.dueTime || '',
      date: detailTask.date,
    })
    setDetailMode('edit')
  }

  // Two write paths: sample tasks change through the overrides layer;
  // planned anchors change in the store, so Today and the briefing follow.
  function saveEdits(event) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) return

    if (isWeekTask(detailTask.id)) {
      updateWeekTask(detailTask.id, {
        title,
        firstStep: draft.firstStep.trim(),
        dueTime: draft.dueTime,
        date: draft.date || detailTask.date,
      })
    } else {
      updatePlanItem(detailTask.date, detailTask.id, {
        title,
        firstStep: draft.firstStep.trim(),
      })
    }
    setData(getWeekDataNow())
    closeDetail()
  }

  function deleteTask() {
    const task = detailTask
    if (isWeekTask(task.id)) {
      const removed = deleteWeekTask(task.id)
      setNotice({
        text: `Removed “${task.title}”.`,
        undo: () => {
          if (removed) restoreWeekTask(removed)
          setData(getWeekDataNow())
          setNotice(null)
        },
      })
    } else {
      // Keep the fields the plan actually stores, so undo puts back a clean
      // anchor rather than the week-view row shape.
      const planItem = {
        id: task.id,
        title: task.title,
        firstStep: task.firstStep,
        source: task.source,
        completed: task.completed,
        startedAt: null,
      }
      removePlanItem(task.date, task.id)
      setNotice({
        text: `Removed “${task.title}”.`,
        undo: () => {
          restorePlanItem(task.date, planItem)
          setData(getWeekDataNow())
          setNotice(null)
        },
      })
    }
    setData(getWeekDataNow())
    closeDetail()
  }

  return (
    <div className="screen week-screen">
      <h2 className="screen-title">This Week</h2>

      {/* Weekly briefing entry point */}
      <div className="card-sage week-briefing">
        <div className="eyebrow">Plan ahead</div>
        <p className="week-briefing-text">
          {status === 'ready'
            ? `${data.tasks.filter((t) => !t.completed).length} open tasks and ${data.events.length} events over the next 7 days.`
            : 'See everything coming up in the next 7 days.'}
        </p>
        <button
          className="btn-week-primary"
          type="button"
          onClick={() => setBriefingOpen((v) => !v)}
          disabled={status !== 'ready'}
        >
          {briefingOpen ? 'Close weekly briefing' : 'Start weekly briefing'}
        </button>
      </div>

      {briefingOpen && status === 'ready' && (
        <div className="card week-briefing-list">
          {days.map(({ key, date }) => {
            const n = openCount(key)
            const ev = (eventsByDay[key] || []).length
            return (
              <button
                key={key}
                type="button"
                className="week-briefing-row"
                onClick={() => {
                  setBriefingOpen(false)
                  jumpToDay(key)
                }}
              >
                <span className="week-briefing-day">{dayLabel(date)}</span>
                <span className="week-briefing-count">
                  {n === 0 ? 'clear' : `${n} task${n > 1 ? 's' : ''}`}
                  {ev > 0 && ` · ${ev} event${ev > 1 ? 's' : ''}`}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* 7-day strip — jumps down the week, doesn't filter it */}
      <nav className="day-strip" ref={stripRef} aria-label="Jump to a day">
        {days.map(({ key, date }) => {
          const n = openCount(key)
          return (
            <button
              key={key}
              type="button"
              data-day={key}
              aria-current={key === activeKey ? 'true' : undefined}
              aria-label={`${dayLabel(date)}, ${monthDay(date)}${n > 0 ? `, ${n} open` : ''}`}
              className={key === activeKey ? 'day-chip selected' : 'day-chip'}
              onClick={() => jumpToDay(key)}
            >
              <span className="day-chip-dow">{DOW[date.getDay()]}</span>
              <span className="day-chip-num">{date.getDate()}</span>
              <span className={n > 0 ? 'day-chip-dot' : 'day-chip-dot hidden'} />
            </button>
          )
        })}
      </nav>

      {/* Get something on the week: your own task, any visible day. */}
      {status === 'ready' && (
        <form className="card week-add" onSubmit={addOwnTask}>
          <label className="eyebrow" htmlFor="week-add-title">Add a task</label>
          <div className="week-add-row">
            <input
              id="week-add-title"
              type="text"
              value={newTask.title}
              placeholder="Something with a deadline"
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <select
              aria-label="Which day"
              value={newTask.date}
              onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
            >
              {days.map(({ key, date }) => (
                <option key={key} value={key}>{dayLabel(date)}</option>
              ))}
            </select>
            <button className="btn-week-primary" type="submit" disabled={!newTask.title.trim()}>
              Add
            </button>
          </div>
          {/* Stays reachable whenever samples are off — a single anchor from
              Today counts as a week task, so gating this on a totally empty
              week hid it almost immediately. */}
          {!samplesEnabled() && (
            <button className="week-add-alt" type="button" onClick={loadSamples}>
              or try a week of sample tasks
            </button>
          )}
        </form>
      )}

      {/* A blank week */}
      {status === 'ready' && data.tasks.length === 0 && data.events.length === 0 && (
        <div className="card week-blank">
          <strong>Your week is a blank page.</strong>
          <p className="week-state-note">Add a task above, or load some samples to look around.</p>
        </div>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div className="card week-loading" aria-live="polite">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton short" />
          <span className="week-state-note">Loading your week…</span>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="card week-error" role="alert">
          <strong>Couldn't load your week.</strong>
          <p className="week-state-note">Check your connection and try again.</p>
          <button className="btn-week-primary" type="button" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {/* The whole week, in order */}
      {status === 'ready' && (
        <div className="week-days">
          {days.map(({ key, date }, index) => {
            const dayTasks = tasksByDay[key] || []
            const dayEvents = eventsByDay[key] || []

            return (
              <section
                key={key}
                className={index === 0 ? 'week-day week-day-today' : 'week-day'}
                ref={(el) => {
                  sectionRefs.current[key] = el
                }}
                aria-label={`${dayLabel(date)}, ${monthDay(date)}`}
              >
                <div className="week-day-head">
                  <h3 className="week-day-title">{dayLabel(date)}</h3>
                  <span className="week-day-date">{monthDay(date)}</span>
                </div>

                {dayTasks.length === 0 && dayEvents.length === 0 ? (
                  <p className="week-day-clear">Nothing scheduled.</p>
                ) : (
                  <>
                    {dayTasks.length > 0 && (
                      <section className="week-section">
                        <h4 className="week-section-title">Due</h4>
                        {dayTasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            className="card week-task"
                            onClick={() => setDetailTask(t)}
                          >
                            <span
                              className={
                                t.completed ? 'week-task-title done' : 'week-task-title'
                              }
                            >
                              {t.title}
                            </span>
                            <span className="week-task-meta">
                              <span className={`source-tag source-${t.source}`}>
                                {SOURCE_LABEL[t.source]}
                              </span>
                              {t.dueTime && (
                                <span className="week-task-time">
                                  due {formatTime(t.dueTime)}
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </section>
                    )}

                    {dayEvents.length > 0 && (
                      <section className="week-section">
                        <h4 className="week-section-title">On the calendar</h4>
                        {dayEvents.map((e) => (
                          <div key={e.id} className="card week-event">
                            <span className="week-event-time">
                              {formatTime(e.start)}
                              {e.end !== e.start && ` – ${formatTime(e.end)}`}
                            </span>
                            <span className="week-event-title">{e.title}</span>
                          </div>
                        ))}
                      </section>
                    )}
                  </>
                )}

                {index === days.length - 1 && (
                  <p className="week-end">That's the week ahead.</p>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Removed-task notice, with the way back */}
      {notice && (
        <div className="today-notice week-notice" role="status">
          <span>{notice.text}</span>
          {notice.undo && (
            <button className="today-notice-undo" type="button" onClick={notice.undo}>
              Undo
            </button>
          )}
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      {/* Task detail */}
      {detailTask && (
        <div
          className="week-detail-backdrop"
          onClick={closeDetail}
          role="presentation"
        >
          <div
            className="week-detail card"
            role="dialog"
            aria-modal="true"
            aria-label="Task details"
            onClick={(e) => e.stopPropagation()}
          >
            {detailMode === 'edit' ? (
              <form className="week-detail-form" onSubmit={saveEdits}>
                <div className="eyebrow">Editing task</div>

                <label htmlFor="week-edit-title">Task</label>
                <input
                  id="week-edit-title"
                  type="text"
                  value={draft.title}
                  autoFocus
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />

                <label htmlFor="week-edit-step">First step</label>
                <input
                  id="week-edit-step"
                  type="text"
                  value={draft.firstStep}
                  onChange={(e) => setDraft({ ...draft, firstStep: e.target.value })}
                />

                {/* Day and due time only exist on week tasks; planned anchors
                    are day-intentions without a clock time. */}
                {isWeekTask(detailTask.id) && (
                  <>
                    <label htmlFor="week-edit-date">Day</label>
                    <input
                      id="week-edit-date"
                      type="date"
                      value={draft.date}
                      min={days[0].key}
                      max={days[days.length - 1].key}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    />

                    <label htmlFor="week-edit-time">Due time</label>
                    <input
                      id="week-edit-time"
                      type="time"
                      value={draft.dueTime}
                      onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })}
                    />
                  </>
                )}

                <div className="week-detail-actions">
                  <button className="btn-week-primary" type="submit" disabled={!draft.title.trim()}>
                    Save
                  </button>
                  <button className="btn-ghost" type="button" onClick={() => setDetailMode('view')}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="eyebrow">
                  {SOURCE_LABEL[detailTask.source]}
                  {detailTask.dueTime ? ` · due ${formatTime(detailTask.dueTime)}` : ''}
                </div>
                <h3 className="week-detail-title">{detailTask.title}</h3>
                {detailTask.completed ? (
                  <p className="week-state-note">Landed. Nice.</p>
                ) : (
                  <div className="week-detail-step">
                    <span className="week-detail-step-pill">First step</span>
                    <span>{detailTask.firstStep}</span>
                  </div>
                )}
                <div className="week-detail-actions">
                  <button className="btn-week-primary" type="button" onClick={closeDetail}>
                    Close
                  </button>
                  {!detailTask.completed && (
                    <button className="btn-ghost" type="button" onClick={openEdit}>
                      Edit
                    </button>
                  )}
                  <button className="btn-ghost week-detail-delete" type="button" onClick={deleteTask}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
