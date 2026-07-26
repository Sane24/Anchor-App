import Placeholder from '../components/Placeholder'

export default function Settings() {
  return (
    <div className="screen">
      <h2 className="screen-title">Settings</h2>
      <Placeholder
        title="Connections"
        note="Toggles for Gmail, Calendar, and Slack. The briefing only pulls from what's turned on."
      />
    </div>
  )
}
