import { useEffect, useMemo, useState } from 'react'
import { getWeekData } from './weekSampleData'
import '../styles/week.css'

// date helpers 

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

const SOURCE_LABEL = { gmail: 'Gmail', calendar: 'Calendar', manual: 'Added by you' }

// screen

export default function ThisWeek() {
  const days = useMemo(nextSevenDays, [])
  const [selected, setSelected] = useState(days[0].key)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [detailTask, setDetailTask] = useState(null)
  const [briefingOpen, setBriefingOpen] = useState(false)

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
    for (const k in map) map[k].sort((a, b) => a.dueTime.localeCompare(b.dueTime))
    return map
  }, [data])

  const eventsByDay = useMemo(() => {
    const map = {}
    if (!data) return map
    for (const e of data.events) (map[e.date] ||= []).push(e)
    for (const k in map) map[k].sort((a, b) => a.start.localeCompare(b.start))
    return map
  }, [data])

  const selectedDay = days.find((d) => d.key === selected)
  const dayTasks = tasksByDay[selected] || []
  const dayEvents = eventsByDay[selected] || []
  const openCount = (key) =>
    (tasksByDay[key] || []).filter((t) => !t.completed).length

  return (
    <div className="screen">
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
                  setSelected(key)
                  setBriefingOpen(false)
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

      {/* 7-day strip */}
      <div className="day-strip" role="tablist" aria-label="Days of the week">
        {days.map(({ key, date }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === selected}
            className={key === selected ? 'day-chip selected' : 'day-chip'}
            onClick={() => setSelected(key)}
          >
            <span className="day-chip-dow">{DOW[date.getDay()]}</span>
            <span className="day-chip-num">{date.getDate()}</span>
            <span
              className={openCount(key) > 0 ? 'day-chip-dot' : 'day-chip-dot hidden'}
            />
          </button>
        ))}
      </div>

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

      {/* Day content */}
      {status === 'ready' && (
        <>
          <div className="eyebrow">
            {dayLabel(selectedDay.date)} ·{' '}
            {selectedDay.date.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </div>

          {dayTasks.length === 0 && dayEvents.length === 0 ? (
            <div className="card week-empty">
              <strong>Nothing scheduled.</strong>
              <p className="week-state-note">
                A clear day. Anything you land is a bonus.
              </p>
            </div>
          ) : (
            <>
              {dayTasks.length > 0 && (
                <section className="week-section">
                  <h3 className="week-section-title">Due this day</h3>
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
                        <span className="week-task-time">
                          due {formatTime(t.dueTime)}
                        </span>
                      </span>
                    </button>
                  ))}
                </section>
              )}

              {dayEvents.length > 0 && (
                <section className="week-section">
                  <h3 className="week-section-title">On the calendar</h3>
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
        </>
      )}

      {/* Task detail */}
      {detailTask && (
        <div
          className="week-detail-backdrop"
          onClick={() => setDetailTask(null)}
          role="presentation"
        >
          <div
            className="week-detail card"
            role="dialog"
            aria-modal="true"
            aria-label="Task details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="eyebrow">
              {SOURCE_LABEL[detailTask.source]} · due{' '}
              {formatTime(detailTask.dueTime)}
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
            <button
              className="btn-week-primary"
              type="button"
              onClick={() => setDetailTask(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}