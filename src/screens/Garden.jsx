import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GardenScene from '../components/GardenScene'
import { loadAllDayPlans, loadSessions } from '../store'

// What grows from what:
//   focus sprints  -> the oak (total focused minutes) + one koi per sprint
//   landed anchors -> wildflowers, species by task source
//   comebacks      -> water lilies (finished after being moved to tomorrow)
// Counting happens here; GardenScene just draws what it's told.

const OAK_STAGES = [
  { name: 'a seed', at: 0 },
  { name: 'a sprout', at: 5 },
  { name: 'a sapling', at: 30 },
  { name: 'a young oak', at: 90 },
  { name: 'a full oak', at: 180 },
  { name: 'in blossom', at: 320 },
]

const MAX_FLOWERS = 10
const MAX_LILIES = 4
const MAX_KOI = 6

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
    flowers: landed
      .filter((anchor) => !isComeback(anchor))
      .map((anchor) => ({ id: anchor.id, species: speciesFor(anchor.source) })),
    comebacks: landed.filter(isComeback).length,
  }
}

// A tended garden, for the "peek at a season" preview. Nothing is saved.
const PREVIEW_STATS = {
  focusMinutes: 340,
  sprints: 9,
  comebacks: 3,
  flowers: [
    { id: 'p1', species: 'poppy' },
    { id: 'p2', species: 'daisy' },
    { id: 'p3', species: 'bell' },
    { id: 'p4', species: 'poppy' },
    { id: 'p5', species: 'daisy' },
    { id: 'p6', species: 'poppy' },
    { id: 'p7', species: 'bell' },
    { id: 'p8', species: 'daisy' },
  ],
}

// Miniatures of the scene elements, so the legend reads as a field guide.

function OakGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18">
      <path d="M10 11 V 18" stroke="#7B5B41" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="6.6" cy="9.4" r="3.8" fill="#66793F" />
      <circle cx="13.4" cy="9.4" r="3.6" fill="#8CA061" />
      <circle cx="10" cy="6.6" r="3.9" fill="#77894F" />
    </svg>
  )
}

function PoppyGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18">
      <g transform="translate(10 10)">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="0" cy="-4.4" rx="3" ry="4.4" fill="#CD7B58" transform={`rotate(${angle})`} />
        ))}
        <circle r="2.4" fill="#57452F" />
      </g>
    </svg>
  )
}

function LilyGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18">
      <path
        d="M 2.5 13 A 7.5 4.6 0 1 0 17.5 13 A 7.5 4.6 0 1 0 2.5 13 M 10 13 L 16.8 10.2 L 17.3 13.7 Z"
        fill="#66814B"
        fillRule="evenodd"
      />
      <g transform="translate(9 8.4)">
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse key={angle} cx="0" cy="-2.9" rx="1.8" ry="2.9" fill="#ECC2CD" transform={`rotate(${angle})`} />
        ))}
        <circle r="1.5" fill="#F6E7EA" />
      </g>
    </svg>
  )
}

function KoiGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18">
      <g transform="translate(3.2 10) rotate(-8)">
        <path d="M0 0 C -2.4 -0.8, -3.6 -2.6, -5 -3.5 C -3.4 -1.1, -3.4 1.1, -5 3.5 C -3.6 2.6, -2.4 0.8, 0 0 Z" fill="#C97B39" transform="translate(3.4 0)" />
        <path d="M3 0 C 6 -2.9, 10.8 -2.6, 13.6 0 C 10.8 2.6, 6 2.9, 3 0 Z" fill="#D98E4A" />
        <circle cx="9" cy="-0.3" r="1.4" fill="#F2E4C7" />
      </g>
    </svg>
  )
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
  const real = useMemo(computeStats, [])
  const stats = previewing ? PREVIEW_STATS : real

  const stage = oakStageIndex(stats.focusMinutes)
  const next = OAK_STAGES[stage + 1]
  const prevAt = OAK_STAGES[stage].at
  const oakProgress = next
    ? (stats.focusMinutes - prevAt) / (next.at - prevAt)
    : 1

  const empty =
    !previewing && stats.focusMinutes === 0 && stats.flowers.length === 0 && stats.comebacks === 0

  return (
    <div className="screen garden-screen">
      <div className="garden-heading">
        <h2 className="screen-title">Garden</h2>
        <p className="garden-sub">A small world that grows as you land the day.</p>
      </div>

      <div className={`card garden-scene-card${previewing ? ' garden-previewing' : ''}`}>
        <GardenScene
          oakStage={stage}
          flowers={stats.flowers.slice(0, MAX_FLOWERS)}
          lilies={Math.min(stats.comebacks, MAX_LILIES)}
          koi={Math.min(stats.sprints, MAX_KOI)}
          showButterfly={stats.flowers.length >= 3}
          showDragonfly={stats.sprints >= 4}
        />
        {previewing && <span className="garden-preview-tag">Preview</span>}
      </div>

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
              ? `${OAK_STAGES[stage].name[0].toUpperCase() + OAK_STAGES[stage].name.slice(1)} — ${next.at - stats.focusMinutes} focused minutes until it's ${next.name}.`
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
            <em>{stats.comebacks}</em>
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
    </div>
  )
}
