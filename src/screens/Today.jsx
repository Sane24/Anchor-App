import { useNavigate } from 'react-router-dom'
import { EditIcon, RepeatIcon } from '../components/icons'
import Placeholder from '../components/Placeholder'
import { useFocusSession } from '../hooks/useFocusSession'

const SAMPLE_ANCHOR = {
  task: 'Design Figma prototype',
  step: 'Open Figma and choose a template',
}

export default function Today() {
  const navigate = useNavigate()
  const { startSession } = useFocusSession()

  // "Start 5 min" hands the anchor to the focus session, then opens the timer
  // with it already counting down.
  function startFocus(anchor) {
    startSession({ task: anchor.task, step: anchor.step, minutes: 5 })
    navigate('/timer')
  }

  return (
    <div className="screen">
      <div className="card-sage">
        <div className="eyebrow">Monday, July 27</div>
        <h1 style={{ fontSize: 'var(--fs-greeting)', margin: '6px 0' }}>Good morning.</h1>
        <p style={{ margin: 0, color: 'var(--ink-soft)' }}>
          Nothing planned yet. Start a morning briefing to pick your three.
        </p>
      </div>

      {/* Sample task card — demonstrates the .task-card styles against the Figma design. */}
      <div className="card task-card">
        <div className="task-head">
          <span className="task-num">1</span>
          <span className="task-title">{SAMPLE_ANCHOR.task}</span>
          <button className="task-check" type="button" aria-label="Mark landed" />
        </div>
        <div className="task-step">
          <span className="task-step-pill">First step</span>
          <span className="task-step-text">{SAMPLE_ANCHOR.step}</span>
          <button className="task-step-edit" type="button" aria-label="Edit first step">
            <EditIcon size={13} />
          </button>
        </div>
        <div className="task-actions">
          <button className="btn-primary" type="button" onClick={() => startFocus(SAMPLE_ANCHOR)}>
            Start 5 min
          </button>
          <button className="btn-ghost" type="button">I started</button>
          <button className="btn-ghost" type="button">
            <RepeatIcon size={12} />
            Tomorrow
          </button>
        </div>
      </div>

      <Placeholder
        title="Today's anchors"
        note="Three checkable anchors, each with a first step, plus Things due today and On the calendar."
      />
    </div>
  )
}
