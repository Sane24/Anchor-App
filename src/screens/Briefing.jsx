import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredGoogleToken } from '../data/googleAuth'
import { dayKey, loadDayPlan, loadJournalEntry, saveBriefingPlan } from '../store'
import { suggestFirstStep, nextFirstStep } from '../firstSteps'
import { getWeekData } from './weekSampleData'

const FILTERS = ['all', 'manual', 'calendar', 'gmail']

// Wording matches This Week's SOURCE_LABEL so the same task reads the same on
// both screens.
const FILTER_LABELS = {
  all: 'All',
  manual: 'Added by you',
  calendar: 'Calendar',
  gmail: 'Gmail',
}

// The "note for tomorrow-you" written in last night's reflection.
function lastNightNote() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return loadJournalEntry(yesterday)?.remember || ''
}

function mergeCandidates(...groups) {
  const merged = new Map()
  groups.flat().forEach((item) => {
    if (item?.id) merged.set(item.id, { ...merged.get(item.id), ...item })
  })
  return Array.from(merged.values())
}

function candidateFromAnchor(anchor, source = anchor.source) {
  return {
    id: anchor.id,
    title: anchor.title,
    source: source || 'manual',
    start: anchor.start,
  }
}

// Undated items (anything typed in here) sort after the week's tasks.
function sortKey(item) {
  return `${item.date || '9999-99-99'} ${item.dueTime || '99:99'}`
}

// "Today" for today, otherwise the weekday, matching how This Week reads.
function dayTag(dateKey) {
  if (!dateKey) return ''
  if (dateKey === dayKey()) return 'Today'
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(year, month - 1, day)
  )
}

function sourceName(source) {
  if (source === 'calendar') return 'Calendar'
  if (source === 'gmail') return 'Gmail'
  if (source === 'rollover') return 'Moved from yesterday'
  return FILTER_LABELS.manual
}

export default function Briefing() {
  const navigate = useNavigate()
  const [initialPlan] = useState(() => loadDayPlan())
  const [nightNote] = useState(lastNightNote)
  const googleConnected = Boolean(getStoredGoogleToken())

  const [items, setItems] = useState(() =>
    mergeCandidates(
      initialPlan.candidates,
      initialPlan.rollover.map((anchor) => candidateFromAnchor(anchor, 'rollover')),
      initialPlan.anchors.map((anchor) => candidateFromAnchor(anchor))
    )
  )
  const [selectedIds, setSelectedIds] = useState(() =>
    initialPlan.anchors.map((anchor) => anchor.id).slice(0, 3)
  )
  const [firstSteps, setFirstSteps] = useState(() => {
    const steps = {}
    ;[...initialPlan.rollover, ...initialPlan.anchors].forEach((anchor) => {
      steps[anchor.id] = anchor.firstStep || suggestFirstStep(anchor.title, anchor.source)
    })
    return steps
  })
  const [customTask, setCustomTask] = useState('')
  const [filter, setFilter] = useState('all')
  const [loadingImports, setLoadingImports] = useState(googleConnected)

  // The possibilities list is This Week's list — the whole week, not just
  // today, so nothing you can see on that screen is missing here.
  useEffect(() => {
    let cancelled = false

    getWeekData()
      .then(({ tasks }) => {
        if (cancelled) return
        // Anything already ticked off on This Week isn't a candidate for today.
        const fromWeek = tasks
          .filter((task) => !task.completed)
          .map((task) => ({
            id: `week-${task.id}`,
            title: task.title,
            source: task.source,
            firstStep: task.firstStep,
            date: task.date,
            dueTime: task.dueTime,
          }))
        // A task saved as a candidate on an earlier visit can have been ticked
        // off since. Drop any week item that is no longer on offer, otherwise
        // it comes back from localStorage and outlives the filter above.
        const liveIds = new Set(fromWeek.map((item) => item.id))
        const isStaleWeekItem = (item) =>
          String(item.id).startsWith('week-') && !liveIds.has(item.id)

        setItems((current) => mergeCandidates(current.filter((i) => !isStaleWeekItem(i)), fromWeek))
        setSelectedIds((current) =>
          current.filter((id) => !(String(id).startsWith('week-') && !liveIds.has(id)))
        )
        setFirstSteps((current) => {
          const next = { ...current }
          fromWeek.forEach((item) => {
            if (!next[item.id]) {
              next[item.id] = item.firstStep || suggestFirstStep(item.title, item.source)
            }
          })
          return next
        })
      })
      .catch((err) => {
        console.error('Could not load this week for the briefing:', err)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Calendar and Gmail are no longer fetched straight into this list. They
  // reach it through This Week, which is the screen that owns those imports —
  // pulling them in again here is what put unrelated tasks in the list.
  useEffect(() => {
    if (googleConnected) setLoadingImports(false)
  }, [googleConnected])

  const visibleItems = items
    .filter((item) => {
      if (filter === 'all') return true
      if (filter === 'manual') {
        return item.source === 'manual' || item.source === 'custom' || item.source === 'rollover'
      }
      return item.source === filter
    })
    // Tuesday before Wednesday, and earlier in the day first.
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

  function toggleItem(item) {
    if (selectedIds.includes(item.id)) {
      setSelectedIds((current) => current.filter((id) => id !== item.id))
      return
    }
    if (selectedIds.length === 3) return

    setSelectedIds((current) => [...current, item.id])
    setFirstSteps((current) => ({
      ...current,
      [item.id]: current[item.id] || suggestFirstStep(item.title, item.source),
    }))
  }

  function tryAnotherStep(item) {
    setFirstSteps((current) => ({
      ...current,
      [item.id]: nextFirstStep(item.title, item.source, current[item.id]),
    }))
  }

  function addManualTask(event) {
    event.preventDefault()
    const title = customTask.trim()
    if (!title) return

    const item = {
      id: `manual-${Date.now()}`,
      title,
      source: 'manual',
    }
    setItems((current) => [...current, item])
    setFirstSteps((current) => ({ ...current, [item.id]: suggestFirstStep(title, 'manual') }))
    setSelectedIds((current) => (current.length < 3 ? [...current, item.id] : current))
    setCustomTask('')
    setFilter('all')
  }

  function saveBriefing() {
    if (selectedIds.length === 0) return
    const existing = new Map(initialPlan.anchors.map((anchor) => [anchor.id, anchor]))

    const anchors = selectedIds.map((id) => {
      const item = items.find((candidate) => candidate.id === id)
      const previous = existing.get(id)
      return {
        id: item.id,
        title: item.title,
        firstStep: firstSteps[id]?.trim() || suggestFirstStep(item.title, item.source),
        source: item.source,
        start: item.start,
        completed: previous?.completed || false,
        startedAt: previous?.startedAt || null,
      }
    })

    saveBriefingPlan(anchors, items)
    navigate('/')
  }

  return (
    <div className="screen briefing-screen">
      <button className="briefing-back" type="button" onClick={() => navigate('/')}>
        ← Today
      </button>

      <section className="card-sage briefing-hero">
        <p className="eyebrow">Morning briefing</p>
        <h1>Choose up to three Anchors</h1>
        <p>Keep today realistic, then make each first step small enough to begin.</p>
      </section>

      {nightNote && (
        <div className="briefing-last-night">
          <span>Last night you wrote</span>
          <em>“{nightNote}”</em>
        </div>
      )}

      {!googleConnected && (
        <div className="briefing-connection">
          <span>Manual planning is ready.</span>
          <button type="button" onClick={() => navigate('/settings')}>
            Connect Google for imports
          </button>
        </div>
      )}

      <form className="card briefing-add" onSubmit={addManualTask}>
        <p className="eyebrow">Add your own task</p>
        <p className="briefing-help">Get it out of your head. You can shape the first step next.</p>
        <div>
          <input
            type="text"
            value={customTask}
            onChange={(event) => setCustomTask(event.target.value)}
            placeholder="e.g. Start the essay outline"
            aria-label="Task to add"
          />
          <button type="submit" disabled={!customTask.trim()}>Add</button>
        </div>
      </form>

      <section className="briefing-review">
        <div className="briefing-review-heading">
          <div>
            <p className="eyebrow">Review and choose</p>
            <h2>Today’s possibilities</h2>
          </div>
          <span>{selectedIds.length} of 3 chosen</span>
        </div>

        {items.length > 0 && (
          <div className="briefing-filters" aria-label="Task filters">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                className={filter === option ? 'active' : ''}
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
              >
                {FILTER_LABELS[option]}
              </button>
            ))}
          </div>
        )}

        {loadingImports && <p className="briefing-status">Gathering Google items…</p>}

        {!loadingImports && visibleItems.length === 0 && (
          <div className="briefing-empty">
            <strong>Nothing waiting here yet.</strong>
            Add a task above when you’re ready.
          </div>
        )}

        <div className="briefing-candidates">
          {visibleItems.map((item) => {
            const selected = selectedIds.includes(item.id)
            const blocked = !selected && selectedIds.length === 3

            return (
              <article
                key={item.id}
                className={`briefing-candidate${selected ? ' selected' : ''}${blocked ? ' blocked' : ''}`}
              >
                <label className="briefing-choice">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={blocked}
                    onChange={() => toggleItem(item)}
                  />
                  <span className="briefing-check" aria-hidden="true" />
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {[dayTag(item.date), item.dueTime, sourceName(item.source)]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                </label>

                {selected && (
                  <div className="briefing-first-step">
                    <div className="briefing-first-step-head">
                      <span>First step</span>
                      <button
                        type="button"
                        className="step-suggest-btn"
                        onClick={() => tryAnotherStep(item)}
                      >
                        Try another
                      </button>
                    </div>
                    <input
                      type="text"
                      value={firstSteps[item.id] || ''}
                      aria-label={`First step for ${item.title}`}
                      onChange={(event) =>
                        setFirstSteps((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="What is the smallest way to begin?"
                    />
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
      
      <div
        className="briefing-finish"
        style={{
          position: 'sticky',
          bottom: 'calc(var(--tabbar-h) + 12px)',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: '15px',
          padding: '10px 12px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <button
          type="button"
          disabled={selectedIds.length === 0}
          onClick={saveBriefing}
        >
          {selectedIds.length === 0
            ? 'Choose at least one Anchor'
            : selectedIds.length === 1
              ? 'Use this Anchor'
              : `Use these ${selectedIds.length} Anchors`}
          <span aria-hidden="true">→</span>
        </button>
        <p>You can come back and adjust the plan later.</p>
      </div>
    </div>
  )
}
