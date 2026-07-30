import { useEffect } from 'react'

// Bottom sheet from the Figma "White/brown noise" frame (node 61:769).
// Playback lives in useAmbientSound; this only picks the value.

// None comes first and is the default, matching the Figma frame — it is also
// the only way to turn ambient sound off once audio is wired up.
const OPTIONS = ['None', 'White noise', 'Brown noise', 'Cafe', 'Rain sound']

export default function AmbientSoundSheet({ selected, onSelect, onClose }) {
  // Neither the scrim nor Escape is in the frame, but a sheet you can't leave
  // is a dead end, and the drag handle isn't draggable here.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Freeze the page behind the sheet. Without this the content still scrolls
  // under the scrim, and an overlay scrollbar fades in and out over it as a
  // flickering light strip at the edge. The padding swap keeps a classic
  // (space-taking) scrollbar from shifting the layout as it disappears.
  useEffect(() => {
    // tokens.css puts height:100% on html, so <html> is the scrolling element —
    // locking `body` alone does nothing here.
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    const previousPadding = root.style.paddingRight
    const gutter = window.innerWidth - root.clientWidth

    root.style.overflow = 'hidden'
    if (gutter > 0) root.style.paddingRight = `${gutter}px`

    return () => {
      root.style.overflow = previousOverflow
      root.style.paddingRight = previousPadding
    }
  }, [])

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sound-sheet" role="dialog" aria-modal="true" aria-label="Ambient sound">
        <div className="sound-sheet-handle" aria-hidden="true" />
        <h2 className="sound-sheet-title">Ambient sound</h2>
        <div className="sound-sheet-options">
          {OPTIONS.map((option) => (
            <button
              key={option}
              className={option === selected ? 'sound-option sound-option-active' : 'sound-option'}
              type="button"
              aria-pressed={option === selected}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
