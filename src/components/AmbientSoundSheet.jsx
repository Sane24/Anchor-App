import { useEffect } from 'react'

// Bottom sheet from the Figma "White/brown noise" frame (node 61:769).
// Picks the sound only — nothing plays audio yet.

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
