import Placeholder from '../components/Placeholder'

export default function ThisWeek() {
  return (
    <div className="screen">
      <h2 className="screen-title">This Week</h2>
      <Placeholder
        title="Week overview"
        note="A 7-day strip, upcoming tasks with due dates, and what's scheduled on the selected day."
      />
    </div>
  )
}
