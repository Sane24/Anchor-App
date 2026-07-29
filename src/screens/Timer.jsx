import { formatTime, useFocusSession } from '../hooks/useFocusSession'

// Focus Sprint — implements the "Focus Sprint - Nami" frame from Figma (node 61:258).
// Not a tab. Opened from an anchor's "Start 5 min" button.

const RING_R = 104
const RING_C = 2 * Math.PI * RING_R

const PRESETS = [5, 10, 15]

const STATE_LABEL = { idle: 'Ready', running: 'Focusing', paused: 'Paused', done: 'Done' }
const START_LABEL = { idle: 'Start', running: 'Pause', paused: 'Resume', done: 'Start again' }

export default function Timer() {
  const {
    task,
    step,
    duration,
    remaining,
    status,
    progress,
    start,
    pause,
    reset,
    selectPreset,
    adjust,
  } = useFocusSession()

  return (
    <div className="screen focus-sprint">
      <div className="focus-card">
        <p className="focus-eyebrow">Focusing on</p>
        <p className="focus-task">{task}</p>
        <p className="focus-next">Next: {step}</p>
      </div>

      {/* Ring geometry is the exported asset's: r=104 at (118,118), 14px stroke.
          Drawn inline rather than as a flat image so the arc can drain as the
          countdown runs. */}
      <div className="focus-dial">
        <svg className="focus-ring" viewBox="0 0 236 236" width="236" height="236" aria-hidden="true">
          <circle className="ring-track" cx="118" cy="118" r={RING_R} fill="none" strokeWidth="14" />
          <circle
            className="ring-progress"
            cx="118"
            cy="118"
            r={RING_R}
            fill="none"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
          />
        </svg>
        <div className="focus-readout">
          <span className="focus-time">{formatTime(remaining)}</span>
          <span className="focus-state">{STATE_LABEL[status]}</span>
        </div>
      </div>

      <div className="focus-presets">
        {PRESETS.map((minutes) => (
          <button
            key={minutes}
            className={
              duration === minutes * 60 ? 'focus-preset focus-preset-active' : 'focus-preset'
            }
            type="button"
            aria-pressed={duration === minutes * 60}
            onClick={() => selectPreset(minutes)}
          >
            {minutes} min
          </button>
        ))}
      </div>

      <div className="focus-controls">
        <button className="focus-adjust" type="button" onClick={() => adjust(-5)}>
          -5 min
        </button>
        <button
          className="focus-start"
          type="button"
          onClick={status === 'running' ? pause : start}
        >
          {START_LABEL[status]}
        </button>
        <button className="focus-adjust" type="button" onClick={() => adjust(5)}>
          +5 min
        </button>
      </div>

      <div className="focus-reset-row">
        <button className="focus-reset" type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <section className="focus-list">
        <h3 className="focus-list-title">Things due today</h3>
        <div className="focus-row focus-row-due">
          <span className="focus-row-label">CS160 PA#2</span>
          <span className="focus-row-time">11:59 PM</span>
        </div>
        <div className="focus-row focus-row-due">
          <span className="focus-row-label">Essay outline</span>
          <span className="focus-row-time">5:00 PM</span>
        </div>
        <div className="focus-row focus-row-due focus-row-last">
          <span className="focus-row-label">Reply to research email</span>
        </div>
      </section>

      <section className="focus-list focus-list-calendar">
        <h3 className="focus-list-title">On the calendar</h3>
        <div className="focus-row">
          <span className="focus-row-at">2:00 PM</span>
          <span className="focus-row-label">Research meeting</span>
        </div>
        <div className="focus-row focus-row-last">
          <span className="focus-row-at">5:30 PM</span>
          <span className="focus-row-label">Gym</span>
        </div>
      </section>
    </div>
  )
}
