import { useState } from 'react'
import { MoonIcon } from '../components/icons'
import {
  addTaskForTomorrow,
  dayKey,
  loadDayPlan,
  loadJournal,
  loadJournalEntry,
  moveAnchorToTomorrow,
  saveJournalEntry,
  updateTodayAnchor,
} from '../store'

// Night reflection: look at what landed, decide what happens to the rest,
// seed tomorrow, and close the day with a few gentle notes. Unfinished
// anchors either roll into tomorrow's briefing or get let go on purpose —
// nothing follows you around by accident.

function tomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

function formattedDate() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

// Sleep is picked from a small range on purpose — a one-tap answer beats a
// precise one you won't bother logging. Steps are typed from your phone.
const SLEEP_OPTIONS = [
  { value: 5, label: '≤5h' },
  { value: 6, label: '6h' },
  { value: 7, label: '7h' },
  { value: 8, label: '8h' },
  { value: 9, label: '9h+' },
]

function sleepLabel(value) {
  return SLEEP_OPTIONS.find((option) => option.value === value)?.label || null
}

// "7h sleep · 6,500 steps" — or null when neither was logged.
function careSummary(entry) {
  const parts = []
  if (entry.sleepHours != null && sleepLabel(entry.sleepHours)) {
    parts.push(`${sleepLabel(entry.sleepHours)} sleep`)
  }
  if (entry.steps != null && entry.steps !== '') {
    parts.push(`${Number(entry.steps).toLocaleString()} steps`)
  }
  return parts.length ? parts.join(' · ') : null
}

function loadPastNights() {
  const today = dayKey()
  return Object.values(loadJournal())
    .filter((entry) => entry.date !== today && entry.closedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
}

function pastNightDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(y, m - 1, d))
}

function heroSummary(anchors, landed, open) {
  if (anchors.length === 0) {
    return 'No plan landed on today’s page — that’s okay. Rest is part of the rhythm.'
  }
  if (open.length === 0 && landed.length === anchors.length) {
    return `All ${landed.length === 1 ? 'of it' : `${landed.length} anchors`} landed. Take the win to bed.`
  }
  if (landed.length === 0) {
    return 'Today didn’t go to plan. That’s information, not failure.'
  }
  return `${landed.length} of ${anchors.length} landed. What’s left can wait for tomorrow.`
}

export default function Reflection() {
  const [plan, setPlan] = useState(() => loadDayPlan())
  const [tomorrowPlan, setTomorrowPlan] = useState(() => loadDayPlan(tomorrowDate()))
  const [entry] = useState(() => loadJournalEntry())
  const [helped, setHelped] = useState(entry?.helped || '')
  const [hindered, setHindered] = useState(entry?.hindered || '')
  const [remember, setRemember] = useState(entry?.remember || '')
  const [sleepHours, setSleepHours] = useState(entry?.sleepHours ?? null)
  const [steps, setSteps] = useState(entry?.steps != null ? String(entry.steps) : '')
  const [closedAt, setClosedAt] = useState(entry?.closedAt || null)
  const [editing, setEditing] = useState(false)
  const [quickTask, setQuickTask] = useState('')
  const [pastNights] = useState(loadPastNights)

  const landed = plan.anchors.filter((anchor) => anchor.completed)
  const open = plan.anchors.filter((anchor) => !anchor.completed && !anchor.releasedAt)
  const released = plan.anchors.filter((anchor) => !anchor.completed && anchor.releasedAt)
  const seeds = [...tomorrowPlan.rollover, ...tomorrowPlan.candidates]

  function rollToTomorrow(anchor) {
    setPlan(moveAnchorToTomorrow(anchor.id))
    setTomorrowPlan(loadDayPlan(tomorrowDate()))
  }

  function letGo(anchor) {
    setPlan(updateTodayAnchor(anchor.id, { releasedAt: new Date().toISOString() }))
  }

  function takeBack(anchor) {
    setPlan(updateTodayAnchor(anchor.id, { releasedAt: null }))
  }

  function addQuickTask(event) {
    event.preventDefault()
    const title = quickTask.trim()
    if (!title) return
    setTomorrowPlan(addTaskForTomorrow(title))
    setQuickTask('')
  }

  function closeDay(event) {
    event.preventDefault()
    const saved = saveJournalEntry({
      helped: helped.trim(),
      hindered: hindered.trim(),
      remember: remember.trim(),
      sleepHours,
      steps: steps.trim() === '' ? null : Math.max(0, parseInt(steps, 10) || 0),
      closedAt: new Date().toISOString(),
    })
    setClosedAt(saved.closedAt)
    setEditing(false)
  }

  const showForm = !closedAt || editing

  return (
    <div className="screen reflect-screen">
      <section className="reflect-hero">
        <span className="reflect-hero-moon" aria-hidden="true">
          <MoonIcon size={26} />
        </span>
        <p className="eyebrow">{formattedDate()}</p>
        <h1>Close the day</h1>
        <p>{heroSummary(plan.anchors, landed, open)}</p>
      </section>

      {landed.length > 0 && (
        <section className="reflect-group">
          <div className="reflect-group-head">
            <h2>Landed today</h2>
            <span>{landed.length} of {plan.anchors.length}</span>
          </div>
          <ul className="reflect-landed">
            {landed.map((anchor) => (
              <li key={anchor.id}>
                <span className="reflect-check" aria-hidden="true">✓</span>
                {anchor.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {open.length > 0 && (
        <section className="reflect-group">
          <div className="reflect-group-head">
            <h2>Still open</h2>
          </div>
          <p className="reflect-help">
            Decide what happens to each one. Moving on is allowed.
          </p>
          <div className="reflect-open-list">
            {open.map((anchor) => (
              <div className="card reflect-open-row" key={anchor.id}>
                <span className="reflect-open-title">{anchor.title}</span>
                <div className="reflect-open-actions">
                  <button className="btn-primary" type="button" onClick={() => rollToTomorrow(anchor)}>
                    Tomorrow
                  </button>
                  <button className="btn-ghost" type="button" onClick={() => letGo(anchor)}>
                    Let it go
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {released.length > 0 && (
        <section className="reflect-group">
          <ul className="reflect-released">
            {released.map((anchor) => (
              <li key={anchor.id}>
                <span>Let go: {anchor.title}</span>
                <button type="button" onClick={() => takeBack(anchor)}>
                  Take it back
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card reflect-tomorrow">
        <p className="eyebrow">Tomorrow</p>
        {seeds.length > 0 ? (
          <p className="reflect-tomorrow-note">
            Your morning briefing starts with{' '}
            <strong>
              {seeds.length} thing{seeds.length === 1 ? '' : 's'} waiting
            </strong>
            {' — '}
            {seeds.slice(0, 3).map((seed) => seed.title).join(', ')}
            {seeds.length > 3 ? `, +${seeds.length - 3} more` : ''}. Not a blank page.
          </p>
        ) : (
          <p className="reflect-tomorrow-note">
            Nothing waiting yet. Drop one thing here tonight and tomorrow starts itself.
          </p>
        )}
        <form className="reflect-tomorrow-add" onSubmit={addQuickTask}>
          <input
            type="text"
            value={quickTask}
            onChange={(event) => setQuickTask(event.target.value)}
            placeholder="One thing for tomorrow…"
            aria-label="Add a task for tomorrow"
          />
          <button type="submit" disabled={!quickTask.trim()}>Add</button>
        </form>
      </section>

      <section className="card reflect-journal">
        <p className="eyebrow">Tonight’s notes</p>

        {showForm ? (
          <form onSubmit={closeDay}>
            <label>
              <span>What helped today?</span>
              <textarea
                rows={2}
                value={helped}
                onChange={(event) => setHelped(event.target.value)}
                placeholder="e.g. One 5-minute sprint before checking my phone"
              />
            </label>
            <label>
              <span>What got in the way?</span>
              <textarea
                rows={2}
                value={hindered}
                onChange={(event) => setHindered(event.target.value)}
                placeholder="e.g. Sat on my bed after class and scrolled"
              />
            </label>
            <label>
              <span>A note for tomorrow-you</span>
              <textarea
                rows={2}
                value={remember}
                onChange={(event) => setRemember(event.target.value)}
                placeholder="Shows up in tomorrow’s briefing"
              />
            </label>

            <div className="reflect-care-field">
              <span>Sleep last night</span>
              <div className="reflect-chips" role="radiogroup" aria-label="Hours of sleep">
                {SLEEP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={sleepHours === option.value}
                    className={sleepHours === option.value ? 'reflect-chip active' : 'reflect-chip'}
                    onClick={() =>
                      setSleepHours(sleepHours === option.value ? null : option.value)
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="reflect-care-field">
              <span>Steps today</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="100"
                list="step-suggestions"
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                placeholder="From your phone, if you like"
              />
              <datalist id="step-suggestions">
                <option value="1000" />
                <option value="2500" />
                <option value="5000" />
                <option value="7500" />
                <option value="10000" />
              </datalist>
            </label>

            <button className="reflect-close-btn" type="submit">
              Close the day
            </button>
          </form>
        ) : (
          <div className="reflect-closed" role="status">
            <strong>Day closed.</strong>
            {remember && <p className="reflect-closed-note">“{remember}”</p>}
            {careSummary({ sleepHours, steps }) && <p>{careSummary({ sleepHours, steps })}</p>}
            <p>
              {seeds.length > 0
                ? `Tomorrow starts with ${seeds.length} thing${seeds.length === 1 ? '' : 's'} waiting. See you in the morning.`
                : 'See you in the morning.'}
            </p>
            <button type="button" onClick={() => setEditing(true)}>
              Edit tonight’s notes
            </button>
          </div>
        )}
      </section>

      {pastNights.length > 0 && (
        <section className="card reflect-past">
          <p className="eyebrow">Past nights</p>
          <ul>
            {pastNights.map((night) => (
              <li key={night.date}>
                <div className="reflect-past-head">
                  <strong>{pastNightDate(night.date)}</strong>
                  {careSummary(night) && <span>{careSummary(night)}</span>}
                </div>
                {(night.remember || night.helped) && (
                  <p>“{night.remember || night.helped}”</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
