import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCalendarEvents, fetchGmailAsTasks } from '../data/googleData'
import { getStoredGoogleToken } from '../data/googleAuth'
import { loadDayPlan, saveBriefingPlan } from '../store'

const FILTERS = ['all', 'manual', 'calendar', 'gmail']

function suggestedStep(title) {
  const task = title.toLowerCase()
  if (task.includes('email') || task.includes('reply')) return 'Write the first sentence'
  if (task.includes('study') || task.includes('review')) return 'Open the study materials'
  if (task.includes('read')) return 'Read the first paragraph'
  if (task.includes('figma') || task.includes('design')) return 'Open the project file'
  if (task.includes('call')) return 'Find the number and open the dialer'
  return 'Open what you need and work for 5 minutes'
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

function sourceName(source) {
  if (source === 'calendar') return 'Calendar'
  if (source === 'gmail') return 'Gmail'
  if (source === 'rollover') return 'Moved from yesterday'
  return 'Manual'
}

export default function Briefing() {
  const navigate = useNavigate()
  const [initialPlan] = useState(() => loadDayPlan())
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
      steps[anchor.id] = anchor.firstStep || suggestedStep(anchor.title)
    })
    return steps
  })
  const [customTask, setCustomTask] = useState('')
  const [filter, setFilter] = useState('all')
  const [loadingImports, setLoadingImports] = useState(googleConnected)

  useEffect(() => {
    if (!googleConnected) return undefined
    let cancelled = false

    async function loadGoogleItems() {
      try {
        const [events, emails] = await Promise.all([
          fetchCalendarEvents(),
          fetchGmailAsTasks(),
        ])
        if (cancelled) return

        const calendarItems = events.map((event) => ({
          id: `cal-${event.id}`,
          title: event.title,
          source: 'calendar',
          start: event.start,
        }))
        const gmailItems = emails.map((email) => ({
          id: `mail-${email.id}`,
          title: email.title,
          source: 'gmail',
          from: email.from,
        }))
        setItems((current) => mergeCandidates(current, calendarItems, gmailItems))
      } catch (err) {
        console.error('Could not load Google items for the briefing:', err)
      } finally {
        if (!cancelled) setLoadingImports(false)
      }
    }

    loadGoogleItems()
    return () => {
      cancelled = true
    }
  }, [googleConnected])

  const visibleItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'manual') {
      return item.source === 'manual' || item.source === 'custom' || item.source === 'rollover'
    }
    return item.source === filter
  })

  function toggleItem(item) {
    if (selectedIds.includes(item.id)) {
      setSelectedIds((current) => current.filter((id) => id !== item.id))
      return
    }
    if (selectedIds.length === 3) return

    setSelectedIds((current) => [...current, item.id])
    setFirstSteps((current) => ({
      ...current,
      [item.id]: current[item.id] || suggestedStep(item.title),
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
    setFirstSteps((current) => ({ ...current, [item.id]: suggestedStep(title) }))
    setSelectedIds((current) => (current.length < 3 ? [...current, item.id] : current))
    setCustomTask('')
    setFilter('all')
  }

  function saveBriefing() {
    if (selectedIds.length !== 3) return
    const existing = new Map(initialPlan.anchors.map((anchor) => [anchor.id, anchor]))

    const anchors = selectedIds.map((id) => {
      const item = items.find((candidate) => candidate.id === id)
      const previous = existing.get(id)
      return {
        id: item.id,
        title: item.title,
        firstStep: firstSteps[id]?.trim() || suggestedStep(item.title),
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
        <h1>Choose three Anchors</h1>
        <p>Keep today realistic, then make each first step small enough to begin.</p>
      </section>

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
                {option[0].toUpperCase() + option.slice(1)}
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
                    <small>{sourceName(item.source)}</small>
                  </span>
                </label>

                {selected && (
                  <label className="briefing-first-step">
                    <span>First step</span>
                    <input
                      type="text"
                      value={firstSteps[item.id] || ''}
                      onChange={(event) =>
                        setFirstSteps((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="What is the smallest way to begin?"
                    />
                  </label>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <div className="briefing-finish">
        <button
          type="button"
          disabled={selectedIds.length !== 3}
          onClick={saveBriefing}
        >
          {selectedIds.length === 3 ? 'Use these three Anchors' : `Choose ${3 - selectedIds.length} more`}
          <span aria-hidden="true">→</span>
        </button>
        <p>You can come back and adjust the plan later.</p>
      </div>
    </div>
  )
}
