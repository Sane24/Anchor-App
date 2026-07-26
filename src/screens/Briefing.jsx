import Placeholder from '../components/Placeholder'

// Not a tab. Opened from the Today screen.
export default function Briefing() {
  return (
    <div className="screen">
      <h2 className="screen-title">Morning briefing</h2>
      <Placeholder
        title="Plan today"
        note="Review what's due, add your own tasks, then pick your top three and set a first step for each."
      />
    </div>
  )
}
