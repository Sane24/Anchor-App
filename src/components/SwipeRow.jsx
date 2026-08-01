import { useRef, useState } from 'react'

// Swipe-to-act wrapper for list cards. Swiping LEFT reveals the accent
// "landed" layer on the right edge; swiping RIGHT reveals the red delete
// layer on the left edge. Past the threshold, releasing commits the action —
// under it, the card springs back.
//
// Pointer Events give one code path for thumb and mouse. The gesture only
// engages after ~10px of clearly-horizontal movement, so taps go through to
// the buttons untouched and vertical scrolling (touch-action: pan-y) stays
// native. It's an accelerator: every action here is also reachable through
// visible buttons, so nothing is gesture-only.

const SLOP = 10
const MAX_COMMIT_PX = 140

export default function SwipeRow({
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
  disabled = false,
  children,
}) {
  const rowRef = useRef(null)
  const start = useRef(null) // { x, y, id }
  const engaged = useRef(false)
  const suppressClick = useRef(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(false)

  const threshold = () =>
    Math.min((rowRef.current?.offsetWidth || 360) * 0.35, MAX_COMMIT_PX)

  function onPointerDown(event) {
    if (disabled || exiting || !event.isPrimary) return
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    engaged.current = false
  }

  function onPointerMove(event) {
    if (!start.current || exiting || event.pointerId !== start.current.id) return
    const moveX = event.clientX - start.current.x
    const moveY = event.clientY - start.current.y

    if (!engaged.current) {
      // Decide once whether this is our gesture or a scroll/tap.
      if (Math.abs(moveX) < SLOP) return
      if (Math.abs(moveX) <= Math.abs(moveY)) {
        start.current = null // vertical intent — let the page scroll
        return
      }
      engaged.current = true
      suppressClick.current = true
      setDragging(true)
      rowRef.current?.setPointerCapture(start.current.id)
    }

    // A little resistance past the commit point, so it feels physical.
    const limit = threshold() * 1.4
    const clamped = Math.max(-limit, Math.min(limit, moveX))
    setDx(clamped)
  }

  function finish(commit) {
    const finalDx = dx
    start.current = null
    engaged.current = false
    setDragging(false)

    if (!commit) {
      setDx(0)
      return
    }

    if (finalDx < 0 && onSwipeLeft) {
      // Landed: the card stays, so spring home while the state flips.
      setDx(0)
      onSwipeLeft()
    } else if (finalDx > 0 && onSwipeRight) {
      // Delete: slide fully out first, then let the handler remove the row.
      setExiting(true)
      setDx((rowRef.current?.offsetWidth || 360) + 40)
      window.setTimeout(() => onSwipeRight(), 190)
    } else {
      setDx(0)
    }
  }

  function onPointerUp() {
    if (!start.current) return
    if (!engaged.current) {
      start.current = null
      return
    }
    finish(Math.abs(dx) >= threshold())
  }

  function onPointerCancel() {
    start.current = null
    engaged.current = false
    setDragging(false)
    setDx(0)
  }

  const armed = Math.abs(dx) >= threshold()
  const progress = Math.min(1, Math.abs(dx) / threshold())

  return (
    <div
      ref={rowRef}
      className={[
        'swipe-row',
        dragging ? 'swipe-dragging' : '',
        exiting ? 'swipe-exiting' : '',
        armed ? 'swipe-armed' : '',
      ].join(' ').trim()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault()
          event.stopPropagation()
          suppressClick.current = false
        }
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {dx > 0 && (
        <div className="swipe-under swipe-under-delete" style={{ '--swipe-progress': progress }}>
          {rightLabel}
        </div>
      )}
      {dx < 0 && (
        <div className="swipe-under swipe-under-land" style={{ '--swipe-progress': progress }}>
          {leftLabel}
        </div>
      )}
      <div className="swipe-card" style={{ transform: `translateX(${dx}px)` }}>
        {children}
      </div>
    </div>
  )
}
