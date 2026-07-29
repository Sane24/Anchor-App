import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { saveSession } from '../store'

// Focus-session state lives above the router so a running timer survives
// navigating away from /timer — that's what lets the popup keep counting.

const FocusSessionContext = createContext(null)

const DEFAULT_SECONDS = 5 * 60
const MIN_SECONDS = 60
const MAX_SECONDS = 120 * 60

const clamp = (s) => Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, s))

export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function FocusSessionProvider({ children }) {
  const [task, setTask] = useState('Design Figma prototype')
  const [step, setStep] = useState('Open Figma and choose a template')
  const [duration, setDuration] = useState(DEFAULT_SECONDS)
  const [remaining, setRemaining] = useState(DEFAULT_SECONDS)
  const [status, setStatus] = useState('idle') // idle | running | paused | done

  const endAtRef = useRef(null)
  const startedAtRef = useRef(null)

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

  // The session is recorded once, when the countdown actually reaches zero.
  useEffect(() => {
    if (status !== 'done') return
    saveSession({
      id: `focus-${Date.now()}`,
      task,
      plannedSeconds: duration,
      startedAt: startedAtRef.current,
      endedAt: new Date().toISOString(),
    })
  }, [status, task, duration])

  const start = useCallback(() => {
    if (status === 'running') return
    // Starting again after a finished session begins a fresh one.
    const seconds = status === 'done' ? duration : remaining
    if (status !== 'paused') startedAtRef.current = new Date().toISOString()
    endAtRef.current = Date.now() + seconds * 1000
    setRemaining(seconds)
    setStatus('running')
  }, [status, duration, remaining])

  // Entry point from an anchor's "Start 5 min" button: adopt that task and
  // begin counting immediately, so /timer opens already running.
  const startSession = useCallback(({ task: nextTask, step: nextStep, minutes }) => {
    const seconds = clamp(minutes * 60)
    if (nextTask) setTask(nextTask)
    if (nextStep) setStep(nextStep)
    setDuration(seconds)
    setRemaining(seconds)
    startedAtRef.current = new Date().toISOString()
    endAtRef.current = Date.now() + seconds * 1000
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
    setRemaining(duration)
    setStatus('idle')
  }, [duration])

  const selectPreset = useCallback((minutes) => {
    const seconds = clamp(minutes * 60)
    endAtRef.current = null
    startedAtRef.current = null
    setDuration(seconds)
    setRemaining(seconds)
    setStatus('idle')
  }, [])

  // +/- 5 min shifts the whole session, and extends the deadline mid-run.
  const adjust = useCallback(
    (deltaMinutes) => {
      const delta = deltaMinutes * 60
      setDuration((prev) => clamp(prev + delta))
      setRemaining((prev) => {
        const next = clamp(prev + delta)
        if (status === 'running') endAtRef.current = Date.now() + next * 1000
        return next
      })
      if (status === 'done') setStatus('idle')
    },
    [status]
  )

  const value = {
    task,
    step,
    duration,
    remaining,
    status,
    progress: duration > 0 ? remaining / duration : 0,
    isActive: status === 'running' || status === 'paused' || status === 'done',
    start,
    startSession,
    pause,
    reset,
    selectPreset,
    adjust,
  }

  return <FocusSessionContext.Provider value={value}>{children}</FocusSessionContext.Provider>
}

export function useFocusSession() {
  const ctx = useContext(FocusSessionContext)
  if (!ctx) throw new Error('useFocusSession must be used inside a FocusSessionProvider')
  return ctx
}
