import { Link, useLocation } from 'react-router-dom'
import { formatTime, useFocusSession } from '../hooks/useFocusSession'

// Mini timer that appears once you navigate away from /timer with a session
// going, so the countdown stays visible and reachable from any tab.
// No Figma frame exists for this — styled from the existing tokens.

const R = 15
const C = 2 * Math.PI * R

export default function TimerPopup() {
  const { task, remaining, status, progress, isActive, start, pause, reset } = useFocusSession()
  const { pathname } = useLocation()

  if (!isActive || pathname === '/timer') return null

  const done = status === 'done'

  return (
    <div className="timer-popup">
      <Link className="timer-popup-main" to="/timer" aria-label="Back to the focus timer">
        <svg className="timer-popup-ring" viewBox="0 0 34 34" width="34" height="34" aria-hidden="true">
          <circle className="ring-track" cx="17" cy="17" r={R} fill="none" strokeWidth="4" />
          <circle
            className="ring-progress"
            cx="17"
            cy="17"
            r={R}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            transform="rotate(-90 17 17)"
          />
        </svg>
        <span className="timer-popup-text">
          <span className="timer-popup-time">{done ? 'Session done' : formatTime(remaining)}</span>
          <span className="timer-popup-task">{task}</span>
        </span>
      </Link>

      {done ? (
        <button className="timer-popup-btn" type="button" onClick={reset}>
          Clear
        </button>
      ) : (
        <button
          className="timer-popup-btn"
          type="button"
          onClick={status === 'running' ? pause : start}
        >
          {status === 'running' ? 'Pause' : 'Resume'}
        </button>
      )}
    </div>
  )
}
