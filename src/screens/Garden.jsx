import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GardenScene, { OakGlyph, PoppyGlyph, LilyGlyph, KoiGlyph } from '../components/GardenScene'
import GardenImmersive from '../components/GardenImmersive'
import { loadAllDayPlans, loadSessions } from '../store'

// What grows from what:
//   focus sprints  -> the oak (total focused minutes) + one koi per sprint
//   landed anchors -> wildflowers, species by task source
//   comebacks      -> water lilies (finished after being moved to tomorrow)
// Counting happens here; GardenScene just draws what it's told. Each grown
// thing keeps the task that grew it, so the walk-in view can tell its story.

const OAK_STAGES = [
  { name: 'A seed', at: 0 },
  { name: 'A sprout', at: 5 },
  { name: 'A sapling', at: 30 },
  { name: 'A young oak', at: 90 },
  { name: 'A full oak', at: 180 },
  { name: 'In blossom', at: 320 },
]

const MAX_KOI = 8

function speciesFor(source) {
  if (source === 'calendar') return 'bell'
  if (source === 'gmail') return 'daisy'
  return 'poppy'
}

function computeStats() {
  const sessions = loadSessions()
  const anchors = Object.values(loadAllDayPlans()).flatMap((plan) => plan.anchors || [])
  const landed = anchors.filter((anchor) => anchor.completed)
  const isComeback = (anchor) => anchor.rolledFrom || anchor.source === 'rollover'

  return {
    focusMinutes: Math.round(
      sessions.reduce((total, s) => total + (s.plannedSeconds || 0), 0) / 60
    ),
    sprints: sessions.length,
    koi: sessions.slice(-MAX_KOI).map((session) => ({
      id: session.id,
      task: session.task,
      minutes: Math.round((session.plannedSeconds || 0) / 60),
      endedAt: session.endedAt,
    })),
    flowers: landed
      .filter((anchor) => !isComeback(anchor))
      .map((anchor) => ({
        id: anchor.id,
        species: speciesFor(anchor.source),
        title: anchor.title,
        source: anchor.source,
        completedAt: anchor.completedAt,
      })),
    lilies: landed.filter(isComeback).map((anchor) => ({
      id: anchor.id,
      title: anchor.title,
      completedAt: anchor.completedAt,
      rolledFrom: anchor.rolledFrom,
    })),
  }
}

// A tended garden, for the "peek at a season" preview. Nothing is saved, and
// the sample tasks are obviously samples.
const PREVIEW_STATS = {
  focusMinutes: 340,
  sprints: 12,
  koi: [
    { id: 'pk1', task: 'Sample: essay outline', minutes: 15, endedAt: '2026-07-27T10:15:00Z' },
    { id: 'pk2', task: 'Sample: CS160 PA#2', minutes: 25, endedAt: '2026-07-27T16:40:00Z' },
    { id: 'pk3', task: 'Sample: reading response', minutes: 10, endedAt: '2026-07-28T09:20:00Z' },
    { id: 'pk4', task: 'Sample: LeetCode habit', minutes: 20, endedAt: '2026-07-28T19:05:00Z' },
    { id: 'pk5', task: 'Sample: Figma prototype', minutes: 45, endedAt: '2026-07-29T11:30:00Z' },
    { id: 'pk6', task: 'Sample: study for midterm', minutes: 30, endedAt: '2026-07-29T15:00:00Z' },
    { id: 'pk7', task: 'Sample: problem set 3', minutes: 25, endedAt: '2026-07-29T17:10:00Z' },
    { id: 'pk8', task: 'Sample: lecture notes review', minutes: 15, endedAt: '2026-07-29T19:40:00Z' },
  ],
  flowers: [
    { id: 'pf1', species: 'poppy', title: 'Sample: essay outline', completedAt: '2026-07-27T17:00:00Z' },
    { id: 'pf2', species: 'daisy', title: 'Sample: reply to research email', completedAt: '2026-07-27T18:10:00Z' },
    { id: 'pf3', species: 'bell', title: 'Sample: research meeting prep', completedAt: '2026-07-28T13:00:00Z' },
    { id: 'pf4', species: 'poppy', title: 'Sample: clean desk reset', completedAt: '2026-07-28T21:30:00Z' },
    { id: 'pf5', species: 'daisy', title: 'Sample: send project update', completedAt: '2026-07-29T09:45:00Z' },
    { id: 'pf6', species: 'poppy', title: 'Sample: Figma prototype', completedAt: '2026-07-29T12:00:00Z' },
    { id: 'pf7', species: 'bell', title: 'Sample: office hours question', completedAt: '2026-07-29T14:20:00Z' },
    { id: 'pf8', species: 'daisy', title: 'Sample: flashcard review', completedAt: '2026-07-29T20:00:00Z' },
    { id: 'pf9', species: 'poppy', title: 'Sample: grocery run', completedAt: '2026-07-30T10:00:00Z' },
    { id: 'pf10', species: 'daisy', title: 'Sample: inbox sweep', completedAt: '2026-07-30T11:20:00Z' },
    { id: 'pf11', species: 'bell', title: 'Sample: dentist appointment', completedAt: '2026-07-30T14:00:00Z' },
    { id: 'pf12', species: 'poppy', title: 'Sample: water the plants', completedAt: '2026-07-30T16:40:00Z' },
    { id: 'pf13', species: 'daisy', title: 'Sample: thank-you email', completedAt: '2026-07-31T09:10:00Z' },
    { id: 'pf14', species: 'bell', title: 'Sample: standup prep', completedAt: '2026-07-31T12:30:00Z' },
    { id: 'pf15', species: 'poppy', title: 'Sample: journal entry', completedAt: '2026-07-31T21:00:00Z' },
    { id: 'pf16', species: 'daisy', title: 'Sample: budget check-in', completedAt: '2026-08-01T10:30:00Z' },
    { id: 'pf17', species: 'bell', title: 'Sample: group project sync', completedAt: '2026-08-01T15:00:00Z' },
    { id: 'pf18', species: 'poppy', title: 'Sample: evening walk', completedAt: '2026-08-01T19:30:00Z' },
  ],
  lilies: [
    { id: 'pl1', title: 'Sample: CS160 PA#2', completedAt: '2026-07-28T22:00:00Z' },
    { id: 'pl2', title: 'Sample: laundry, finally', completedAt: '2026-07-29T10:00:00Z' },
    { id: 'pl3', title: 'Sample: dreaded email', completedAt: '2026-07-29T16:30:00Z' },
    { id: 'pl4', title: 'Sample: gym, week two', completedAt: '2026-07-30T18:00:00Z' },
    { id: 'pl5', title: 'Sample: call home', completedAt: '2026-07-31T17:20:00Z' },
  ],
}

function oakStageIndex(minutes) {
  let stage = 0
  OAK_STAGES.forEach((s, i) => {
    if (minutes >= s.at) stage = i
  })
  return stage
}

export default function Garden() {
  const [previewing, setPreviewing] = useState(false)
  const [inside, setInside] = useState(false)
  const real = useMemo(computeStats, [])
  const stats = previewing ? PREVIEW_STATS : real

  const stage = oakStageIndex(stats.focusMinutes)
  const next = OAK_STAGES[stage + 1]
  const prevAt = OAK_STAGES[stage].at
  const oakProgress = next
    ? (stats.focusMinutes - prevAt) / (next.at - prevAt)
    : 1

  const empty =
    !previewing && stats.focusMinutes === 0 && stats.flowers.length === 0 && stats.lilies.length === 0

  return (
    <div className="screen garden-screen">
      <div className="garden-heading">
        <h2 className="screen-title">Garden</h2>
        <p className="garden-sub">A small world that grows as you land the day.</p>
      </div>

      <button
        className={`card garden-scene-card garden-scene-open${previewing ? ' garden-previewing' : ''}`}
        type="button"
        aria-label="Enter your garden"
        onClick={() => setInside(true)}
      >
        <GardenScene
          oakStage={stage}
          flowers={stats.flowers}
          lilies={stats.lilies}
          koi={stats.koi}
          showButterfly={stats.flowers.length >= 3}
          showDragonfly={stats.sprints >= 4}
        />
        {previewing && <span className="garden-preview-tag">Preview</span>}
      </button>

      <div className="garden-preview-row">
        <button
          className="garden-preview-btn"
          type="button"
          onClick={() => setPreviewing((current) => !current)}
        >
          {previewing ? 'Back to my garden' : 'Peek at a season of growth'}
        </button>
        {previewing && <p>This is what a tended season looks like. Your real garden is safe.</p>}
      </div>

      {empty ? (
        <div className="card garden-empty">
          <strong>Nothing planted yet.</strong>
          <p>
            Your first 5-minute focus sprint plants the seed — the garden takes it
            from there. No streaks to lose, nothing here ever dies.
          </p>
          <Link className="garden-empty-cta" to="/">
            Start with one anchor
          </Link>
        </div>
      ) : (
        <div className="card garden-oak-card">
          <div className="garden-oak-row">
            <span className="eyebrow">The oak</span>
            <strong>
              {stats.focusMinutes} focused min
            </strong>
          </div>
          <div
            className="garden-oak-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(oakProgress * 100)}
            aria-label="Oak growth toward its next stage"
          >
            <span style={{ width: `${Math.round(oakProgress * 100)}%` }} />
          </div>
          <p className="garden-oak-note">
            {next
              ? `${OAK_STAGES[stage].name} — ${next.at - stats.focusMinutes} focused minutes until it's ${next.name.toLowerCase()}.`
              : 'In full blossom. Every sprint keeps it that way.'}
          </p>
        </div>
      )}

      <div className="card garden-legend">
        <p className="eyebrow">How it grows</p>
        <ul>
          <li>
            <span className="garden-legend-dot" aria-hidden="true"><OakGlyph /></span>
            <span>
              <strong>Focus sprints grow the oak</strong>
              <small>Deep-work minutes, straight from the timer.</small>
            </span>
            <em>{stats.sprints}</em>
          </li>
          <li>
            <span className="garden-legend-dot" aria-hidden="true"><PoppyGlyph /></span>
            <span>
              <strong>Landed anchors bloom</strong>
              <small>Poppies from your own tasks, daisies from Gmail, bellflowers from Calendar.</small>
            </span>
            <em>{stats.flowers.length}</em>
          </li>
          <li>
            <span className="garden-legend-dot" aria-hidden="true"><LilyGlyph /></span>
            <span>
              <strong>Comebacks open water lilies</strong>
              <small>Anchors finished after moving to tomorrow. Recovery counts.</small>
            </span>
            <em>{stats.lilies.length}</em>
          </li>
          <li>
            <span className="garden-legend-dot" aria-hidden="true"><KoiGlyph /></span>
            <span>
              <strong>Each sprint adds a koi</strong>
              <small>The pond fills as you show up, five minutes at a time.</small>
            </span>
            <em>{Math.min(stats.sprints, MAX_KOI)}{stats.sprints > MAX_KOI ? '+' : ''}</em>
          </li>
        </ul>
      </div>

      {inside && (
        <GardenImmersive
          stats={stats}
          oakStage={stage}
          oakStageName={OAK_STAGES[stage].name}
          previewing={previewing}
          onClose={() => setInside(false)}
        />
      )}
    </div>
  )
}
