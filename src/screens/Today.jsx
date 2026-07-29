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
        note="Three checkable anchors, each with an editable first step."
      />

      <section className="today-info-list">
        <h3 className="today-info-title">Things due today</h3>
        <div className="today-info-row today-info-row-due">
          <span className="today-info-label">CS160 PA#2</span>
          <span className="today-info-time">11:59 PM</span>
        </div>
        <div className="today-info-row today-info-row-due">
          <span className="today-info-label">Essay outline</span>
          <span className="today-info-time">5:00 PM</span>
        </div>
        <div className="today-info-row today-info-row-due today-info-row-last">
          <span className="today-info-label">Reply to research email</span>
        </div>
      </section>

      <section className="today-info-list">
        <h3 className="today-info-title">On the calendar</h3>
        <div className="today-info-row">
          <span className="today-info-at">2:00 PM</span>
          <span className="today-info-label">Research meeting</span>
        </div>
        <div className="today-info-row today-info-row-last">
          <span className="today-info-at">5:30 PM</span>
          <span className="today-info-label">Gym</span>
        </div>
      </section>
    </div>
  )
}
