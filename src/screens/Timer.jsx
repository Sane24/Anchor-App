import Placeholder from '../components/Placeholder'

// Not a tab. Opened from an anchor's "Start 5 min" button.
export default function Timer() {
  return (
    <div className="screen">
      <h2 className="screen-title">Focus timer</h2>
      <Placeholder
        title="Start small"
        note="5 / 10 / 15 minute presets, plus or minus 5, live countdown, and the session gets logged."
      />
    </div>
  )
}
