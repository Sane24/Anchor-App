import { useEffect, useRef } from 'react'
import { MIN_SECONDS, PHASES, formatTime, useFocusSession } from '../hooks/useFocusSession'

// One wheel notch. Shift gives second-level precision.
const STEP_SECONDS = 15
const FINE_STEP_SECONDS = 1

// A full turn is the phase's own duration, so "Ready" always shows a complete
// ring and the handle sits at twelve. Dragging therefore scrubs the run
// shorter; lengthening is what the presets and +5 min are for.
const THUMB_R = 9

// Angle of the handle, clockwise from twelve. The svg is rotated -90deg, so
// 0 rad already points up.
function thumbPoint(fraction) {
  const radians = fraction * 2 * Math.PI
  return {
    x: 118 + RING_R * Math.cos(radians),
    y: 118 + RING_R * Math.sin(radians),
  }
}

// Focus Sprint — implements the "Focus Sprint - Nami" frame from Figma (node 61:258).
// Not a tab. Opened from an anchor's "Start 5 min" button.

const RING_R = 104
const RING_C = 2 * Math.PI * RING_R

const STATE_LABEL = {
  focus: { idle: 'Ready', running: 'Focusing', paused: 'Paused', done: 'Round done' },
  short: { idle: 'Ready', running: 'On a break', paused: 'Paused', done: 'Break over' },
  long: { idle: 'Ready', running: 'Long break', paused: 'Paused', done: 'Break over' },
}

export default function Timer() {
  const {
    task,
    step,
    duration,
    remaining,
    status,
    start,
    pause,
    reset,
    selectPreset,
    setRemainingSeconds,
    adjust,
    phase,
    nextPhase,
    nextPhaseSeconds,
    round,
    roundsBeforeLong,
  } = useFocusSession()

  const startLabel =
    status === 'running'
      ? 'Pause'
      : status === 'paused'
        ? 'Resume'
        : status === 'done'
          ? `Start ${PHASES[nextPhase].label.toLowerCase()}`
          : 'Start'

  // The dial itself sets the time: scroll it on a desktop, drag it on a phone.
  // Presets and +/- 5 min stay for the common cases.
  const dialRef = useRef(null)
  const dragRef = useRef(null)
  // The wheel listener is attached once, so it needs the live value rather than
  // whatever `remaining` was when the effect ran.
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining

  // A trackpad can fire several wheel events before React re-renders. Writing
  // the new value straight back into the ref lets those stack instead of every
  // event in the batch reading the same stale number and collapsing to one step.
  const applySeconds = (seconds) => {
    const next = Math.min(duration, Math.max(MIN_SECONDS, Math.round(seconds)))
    remainingRef.current = next
    setRemainingSeconds(next)
  }

  const nudge = (deltaSeconds) => applySeconds(remainingRef.current + deltaSeconds)

  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge

  const dialFraction = duration > 0 ? remaining / duration : 0
  const thumb = thumbPoint(dialFraction)

  useEffect(() => {
    const el = dialRef.current
    if (!el) return undefined
    // Non-passive so the page behind the dial doesn't scroll with it. React
    // registers wheel handlers as passive, hence the manual listener.
    const onWheel = (event) => {
      event.preventDefault()
      const direction = event.deltaY > 0 ? -1 : 1
      const step = event.shiftKey ? FINE_STEP_SECONDS : STEP_SECONDS
      nudgeRef.current(direction * step)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function onPointerDown(event) {
    // Capture keeps the drag alive if the finger leaves the ring, but a failed
    // capture must not abort the drag itself.
    try {
      dialRef.current?.setPointerCapture?.(event.pointerId)
    } catch {
      /* pointer already gone */
    }
    const seconds = secondsFromPointer(event)
    dragRef.current = { seconds }
    applySeconds(seconds)
  }

  // Where the pointer sits on the dial, as seconds clockwise from twelve.
  function secondsFromPointer(event) {
    const rect = dialRef.current.getBoundingClientRect()
    const centreX = rect.left + rect.width / 2
    const centreY = rect.top + rect.height / 2
    let angle = Math.atan2(event.clientX - centreX, centreY - event.clientY)
    if (angle < 0) angle += 2 * Math.PI
    return (angle / (2 * Math.PI)) * duration
  }

  function onPointerMove(event) {
    if (!dragRef.current) return
    const raw = secondsFromPointer(event)
    const previous = dragRef.current.seconds
    let next = raw

    // Dragging past twelve would otherwise teleport between 0:00 and 60:00.
    // Treat a jump of more than half the dial as hitting that end instead.
    const delta = raw - previous
    if (delta > duration / 2) next = MIN_SECONDS
    else if (delta < -duration / 2) next = duration

    dragRef.current.seconds = next
    applySeconds(next)
  }

  function endDrag(event) {
    dragRef.current = null
    try {
      dialRef.current?.releasePointerCapture?.(event.pointerId)
    } catch {
      /* nothing captured */
    }
  }

  function onDialKeyDown(event) {
    const step = event.shiftKey ? FINE_STEP_SECONDS : STEP_SECONDS
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      nudge(step)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      nudge(-step)
    } else if (event.key === 'PageUp') {
      event.preventDefault()
      nudge(60)
    } else if (event.key === 'PageDown') {
      event.preventDefault()
      nudge(-60)
    }
  }

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
      <div
        ref={dialRef}
        className="focus-dial"
        role="slider"
        tabIndex={0}
        aria-label="Timer duration"
        aria-valuemin={MIN_SECONDS}
        aria-valuemax={duration}
        aria-valuenow={remaining}
        aria-valuetext={formatTime(remaining)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onDialKeyDown}
      >
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
            strokeDashoffset={RING_C * (1 - dialFraction)}
          />
          {/* Handle: rides the end of the arc as the clock runs, and is what
              you grab to lengthen or shorten the session. */}
          <circle
            className="ring-thumb"
            cx={thumb.x}
            cy={thumb.y}
            r={THUMB_R}
            strokeWidth="3"
          />
        </svg>
        <div className="focus-readout">
          <span className="focus-time">{formatTime(remaining)}</span>
          <span className="focus-state">{STATE_LABEL[phase][status]}</span>
          {status === 'idle' && <span className="focus-dial-hint">scroll to set</span>}
        </div>
      </div>

      <div className="focus-cycle">
        <span className="focus-phase">{PHASES[phase].label}</span>
        <span className="focus-rounds" aria-label={`Round ${Math.min(round + 1, roundsBeforeLong)} of ${roundsBeforeLong}`}>
          {Array.from({ length: roundsBeforeLong }, (_, i) => (
            <span
              key={i}
              className={i < round ? 'focus-round done' : 'focus-round'}
              aria-hidden="true"
            />
          ))}
        </span>
      </div>

      {/* Otherwise nothing on this screen hints that breaks are part of it —
          the break only surfaced once a round had already finished. */}
      <p className="focus-next-hint">
        Next · {PHASES[nextPhase].label} {formatTime(nextPhaseSeconds)}
      </p>

      <div className="focus-presets">
        {PHASES[phase].presets.map((minutes) => (
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
          {startLabel}
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
    </div>
  )
}
