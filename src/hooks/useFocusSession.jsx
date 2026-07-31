import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { saveSession } from '../store'

// Focus-session state lives above the router so a running timer survives
// navigating away from /timer — that's what lets the popup keep counting.

const FocusSessionContext = createContext(null)

// Pomodoro cycle: focus, then a short break, with a long break after four
// focus rounds. Every phase length stays editable — these are only the starting
// points.
export const PHASES = {
  // Three presets per phase — a fourth overflows the row and wraps the labels.
  focus: { label: 'Focus', defaultSeconds: 25 * 60, presets: [5, 15, 25] },
  short: { label: 'Short break', defaultSeconds: 5 * 60, presets: [3, 5, 10] },
  long: { label: 'Long break', defaultSeconds: 15 * 60, presets: [10, 15, 20] },
}

export const ROUNDS_BEFORE_LONG = 4

const DEFAULT_SECONDS = PHASES.focus.defaultSeconds
// Typing a duration by hand is allowed down to the second, so the floor is a
// few seconds rather than a whole minute.
export const MIN_SECONDS = 5
export const MAX_SECONDS = 120 * 60

const clamp = (s) => Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(s)))

// Accepts "7:30", "7", ":45" and "0:45". A bare number is read as minutes,
// which is what the presets and the +/- buttons train people to expect.
export function parseDuration(text) {
  const trimmed = String(text).trim()
  if (!trimmed) return null

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    // Reject "1:2:3" rather than silently reading it as 1:02.
    if (parts.length !== 2) return null
    const [rawMinutes, rawSeconds] = parts
    const minutes = rawMinutes === '' ? 0 : Number(rawMinutes)
    const seconds = rawSeconds === '' ? 0 : Number(rawSeconds)
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
    if (minutes < 0 || seconds < 0) return null
    return clamp(minutes * 60 + seconds)
  }

  const minutes = Number(trimmed)
  if (!Number.isFinite(minutes) || minutes < 0) return null
  return clamp(minutes * 60)
}

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// A running timer survives a refresh by storing its wall-clock deadline rather
// than a countdown, so time keeps passing while the tab is closed.
const TIMER_KEY = 'anchor_focus_timer_v1'
// Anything older than this is stale — coming back the next day should start
// fresh, not resume yesterday's sprint or bank a session you never sat through.
const MAX_RESTORE_AGE_MS = 12 * 60 * 60 * 1000

function readSavedTimer() {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    // JSON.parse('null') succeeds and returns null, so check the type too.
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null
    if (!saved.savedAt || Date.now() - saved.savedAt > MAX_RESTORE_AGE_MS) return null
    return saved
  } catch (err) {
    console.error('Could not read the saved timer:', err)
    return null
  }
}

// Seconds left for a restored timer: a running one keeps counting against its
// deadline; anything else is frozen where it was left.
function restoredRemaining(saved) {
  if (saved.status === 'running' && saved.endAt) {
    return Math.max(0, Math.round((saved.endAt - Date.now()) / 1000))
  }
  return saved.remaining ?? DEFAULT_SECONDS
}

export function FocusSessionProvider({ children }) {
  // Restored once, before the first render, so a refresh doesn't reset the timer.
  const [restored] = useState(readSavedTimer)

  const [task, setTask] = useState(restored?.task ?? 'Design Figma prototype')
  const [step, setStep] = useState(restored?.step ?? 'Open Figma and choose a template')
  const [duration, setDuration] = useState(restored?.duration ?? DEFAULT_SECONDS)
  const [remaining, setRemaining] = useState(
    restored ? restoredRemaining(restored) : DEFAULT_SECONDS
  )
  // idle | running | paused | done. A run whose deadline passed while the tab
  // was closed comes back finished, not still counting.
  const [status, setStatus] = useState(() => {
    if (!restored) return 'idle'
    if (restored.status === 'running' && restoredRemaining(restored) === 0) return 'done'
    return restored.status
  })

  const [phase, setPhase] = useState(restored?.phase ?? 'focus')
  const [round, setRound] = useState(restored?.round ?? 0) // focus rounds since the last long break
  // Each phase remembers its own length, so editing the break doesn't clobber
  // the focus length you set earlier.
  const [phaseSeconds, setPhaseSeconds] = useState(
    restored?.phaseSeconds ?? {
      focus: PHASES.focus.defaultSeconds,
      short: PHASES.short.defaultSeconds,
      long: PHASES.long.defaultSeconds,
    }
  )

  const endAtRef = useRef(restored?.endAt ?? null)
  const startedAtRef = useRef(restored?.startedAt ?? null)
  // Guards against saving the same finished run twice — once before a refresh
  // and again when the restored 'done' state re-triggers the save effect.
  const savedRef = useRef(Boolean(restored?.sessionSaved))

  // What the cycle moves to once the current phase finishes.
  // `round` is incremented the moment a focus phase finishes, so at that point
  // it already counts the round just completed.
  const nextPhase =
    phase === 'focus' ? (round >= ROUNDS_BEFORE_LONG ? 'long' : 'short') : 'focus'

  // Remember a new length for whichever phase is on screen.
  const rememberPhaseLength = useCallback(
    (seconds) => setPhaseSeconds((prev) => ({ ...prev, [phase]: seconds })),
    [phase]
  )

  // Count down against a wall-clock deadline instead of decrementing a counter,
  // so a throttled background tab doesn't cause the timer to drift.
  useEffect(() => {
    if (status !== 'running') return undefined
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) setStatus('done')
    }, 250)
    return () => clearInterval(id)
  }, [status])

  // Recorded once, when the countdown reaches zero. Breaks are not focus work,
  // so only focus phases are saved — otherwise the Garden would count rests.
  useEffect(() => {
    if (status !== 'done' || phase !== 'focus') return
    // A restored 'done' run was already banked before the refresh.
    if (savedRef.current) return
    savedRef.current = true

    saveSession({
      id: `focus-${Date.now()}`,
      task,
      plannedSeconds: duration,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
    })
    // Bank the round here rather than when the break starts, so the indicator
    // fills as soon as the round is actually over.
    setRound((prev) => prev + 1)
  }, [status, phase, task, duration])

  // Mirror the timer to storage so a refresh picks it back up. `remaining` is
  // deliberately not a dependency — it ticks four times a second, and for a
  // running timer the deadline below already carries that information.
  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_KEY,
        JSON.stringify({
          task,
          step,
          phase,
          round,
          phaseSeconds,
          duration,
          remaining,
          status,
          endAt: endAtRef.current,
          startedAt: startedAtRef.current,
          sessionSaved: savedRef.current,
          savedAt: Date.now(),
        })
      )
    } catch (err) {
      console.error('Could not save the timer:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, step, phase, round, phaseSeconds, duration, status])

  const start = useCallback(() => {
    if (status === 'running') return

    // Finishing a phase advances the cycle rather than repeating it.
    if (status === 'done') {
      const target = nextPhase
      // A finished long break closes the set and starts counting again.
      if (phase === 'long') setRound(0)

      const seconds = phaseSeconds[target]
      setPhase(target)
      setDuration(seconds)
      setRemaining(seconds)
      startedAtRef.current = new Date().toISOString()
      endAtRef.current = Date.now() + seconds * 1000
      savedRef.current = false // a fresh run, eligible to be banked again
      setStatus('running')
      return
    }

    if (status !== 'paused') {
      startedAtRef.current = new Date().toISOString()
      savedRef.current = false
    }
    endAtRef.current = Date.now() + remaining * 1000
    setStatus('running')
  }, [status, phase, round, nextPhase, phaseSeconds, remaining])

  // Entry point from an anchor's "Start 5 min" button: adopt that task and
  // begin counting immediately, so /timer opens already running.
  const startSession = useCallback(({ task: nextTask, step: nextStep, minutes }) => {
    const seconds = clamp(minutes * 60)
    if (nextTask) setTask(nextTask)
    if (nextStep) setStep(nextStep)
    // An anchor always opens a focus round, whatever the cycle was showing.
    setPhase('focus')
    setPhaseSeconds((prev) => ({ ...prev, focus: seconds }))
    setDuration(seconds)
    setRemaining(seconds)
    startedAtRef.current = new Date().toISOString()
    endAtRef.current = Date.now() + seconds * 1000
    savedRef.current = false
    setStatus('running')
  }, [])

  const pause = useCallback(() => {
    if (status !== 'running') return
    setRemaining(Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000)))
    setStatus('paused')
  }, [status])

  const reset = useCallback(() => {
    endAtRef.current = null
    startedAtRef.current = null
    savedRef.current = false
    setRemaining(duration)
    setStatus('idle')
  }, [duration])

  const selectPreset = useCallback(
    (minutes) => {
      const seconds = clamp(minutes * 60)
      endAtRef.current = null
      startedAtRef.current = null
      setDuration(seconds)
      setRemaining(seconds)
      rememberPhaseLength(seconds)
      setStatus('idle')
    },
    [rememberPhaseLength]
  )

  // Typed-in duration. Unlike selectPreset this keeps a running session going,
  // so you can retime mid-sprint without losing it.
  const setDurationSeconds = useCallback(
    (seconds) => {
      const next = clamp(seconds)
      setDuration(next)
      setRemaining(next)
      rememberPhaseLength(next)
      if (status === 'running') endAtRef.current = Date.now() + next * 1000
      else endAtRef.current = null
      if (status === 'done') setStatus('idle')
    },
    [status, rememberPhaseLength]
  )

  // Dragging the dial scrubs how much of this run is left. The dial's full turn
  // is the phase duration, so it can only ever shorten — lengthening goes
  // through the presets or +5 min, which move `duration` itself.
  const setRemainingSeconds = useCallback(
    (seconds) => {
      const next = Math.min(duration, Math.max(MIN_SECONDS, Math.round(seconds)))
      setRemaining(next)
      if (status === 'running') endAtRef.current = Date.now() + next * 1000
      if (status === 'done') setStatus('idle')
    },
    [duration, status]
  )

  // +/- 5 min shifts the whole session, and extends the deadline mid-run.
  const adjust = useCallback(
    (deltaMinutes) => {
      const delta = deltaMinutes * 60
      setDuration((prev) => {
        const next = clamp(prev + delta)
        rememberPhaseLength(next)
        return next
      })
      setRemaining((prev) => {
        const next = clamp(prev + delta)
        if (status === 'running') endAtRef.current = Date.now() + next * 1000
        return next
      })
      if (status === 'done') setStatus('idle')
    },
    [status, rememberPhaseLength]
  )

  const value = {
    task,
    step,
    duration,
    remaining,
    status,
    progress: duration > 0 ? remaining / duration : 0,
    isActive: status === 'running' || status === 'paused' || status === 'done',
    phase,
    nextPhase,
    nextPhaseSeconds: phaseSeconds[nextPhase],
    round,
    roundsBeforeLong: ROUNDS_BEFORE_LONG,
    start,
    startSession,
    pause,
    reset,
    selectPreset,
    setDurationSeconds,
    setRemainingSeconds,
    adjust,
  }

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>
}

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext)
  if (!ctx) throw new Error('useFocusSession must be used inside a FocusSessionProvider')
  return ctx
}
