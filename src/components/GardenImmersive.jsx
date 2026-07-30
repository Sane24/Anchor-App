import { useEffect, useState } from 'react'
import GardenScene, {
  OakGlyph,
  PoppyGlyph,
  DaisyGlyph,
  BellGlyph,
  LilyGlyph,
  KoiGlyph,
} from './GardenScene'

// Walk-in view of the garden. Full-screen, extended sky, and every grown
// thing is tappable — the bottom sheet tells you which task grew it.

const SPECIES = {
  poppy: { name: 'Poppy', Glyph: PoppyGlyph, sourceLine: 'A task you added yourself' },
  daisy: { name: 'Daisy', Glyph: DaisyGlyph, sourceLine: 'A task from Gmail' },
  bell: { name: 'Bellflower', Glyph: BellGlyph, sourceLine: 'A task from Calendar' },
}

function formatDay(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date)
}

function sheetContent(pick, stats, oakStageName) {
  if (pick.type === 'oak') {
    return {
      Glyph: OakGlyph,
      kicker: 'The oak · deep work',
      title:
        stats.focusMinutes > 0
          ? `${stats.focusMinutes} focused minutes`
          : 'Still a seed',
      line:
        stats.focusMinutes > 0
          ? `${oakStageName}, grown from ${stats.sprints} focus sprint${stats.sprints === 1 ? '' : 's'}.`
          : 'Your first focus sprint wakes it up.',
    }
  }
  if (pick.type === 'flower') {
    const species = SPECIES[pick.item.species] || SPECIES.poppy
    const day = formatDay(pick.item.completedAt)
    return {
      Glyph: species.Glyph,
      kicker: `Wildflower · ${species.name.toLowerCase()}`,
      title: pick.item.title || 'A landed anchor',
      line: `${species.sourceLine} — landed${day ? ` on ${day}` : ''}.`,
    }
  }
  if (pick.type === 'lily') {
    const day = formatDay(pick.item.completedAt)
    return {
      Glyph: LilyGlyph,
      kicker: 'Water lily · comeback',
      title: pick.item.title || 'A comeback',
      line: `Moved to tomorrow, landed anyway${day ? ` on ${day}` : ''}. Recovery counts.`,
    }
  }
  // koi
  const day = formatDay(pick.item.endedAt)
  return {
    Glyph: KoiGlyph,
    kicker: 'Koi · focus sprint',
    title: pick.item.task || 'A focus sprint',
    line: `${pick.item.minutes} focused minute${pick.item.minutes === 1 ? '' : 's'}${day ? ` on ${day}` : ''}.`,
  }
}

export default function GardenImmersive({ stats, oakStage, oakStageName, previewing, onClose }) {
  const [pick, setPick] = useState(null)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const grown =
    stats.focusMinutes > 0 || stats.flowers.length > 0 || stats.lilies.length > 0

  const detail = pick && sheetContent(pick, stats, oakStageName)

  return (
    <div className="garden-immersive" role="region" aria-label="Inside your garden">
      <GardenScene
        tall
        oakStage={oakStage}
        flowers={stats.flowers}
        lilies={stats.lilies}
        koi={stats.koi}
        showButterfly={stats.flowers.length >= 3}
        showDragonfly={stats.sprints >= 4}
        onPick={setPick}
        selectedId={pick?.id ?? null}
      />

      {previewing && <span className="garden-preview-tag">Preview</span>}

      <button className="garden-leave" type="button" aria-label="Leave the garden" onClick={onClose}>
        ×
      </button>

      {detail ? (
        <div className="garden-sheet" role="status">
          <span className="garden-sheet-icon" aria-hidden="true">
            <detail.Glyph />
          </span>
          <span className="garden-sheet-body">
            <span className="eyebrow">{detail.kicker}</span>
            <strong>{detail.title}</strong>
            <span className="garden-sheet-line">{detail.line}</span>
          </span>
          <button
            className="garden-sheet-close"
            type="button"
            aria-label="Close details"
            onClick={() => setPick(null)}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="garden-sheet garden-sheet-hint">
          {grown
            ? 'Everything here remembers. Tap a flower, the oak, a lily, or a koi.'
            : 'Just a seed so far. Tap it — then go land something.'}
        </div>
      )}
    </div>
  )
}
