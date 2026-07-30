// Sample week data for the This Week screen. — Reed
// TEMPORARY: Madison's real Gmail/Calendar layer (src/data/) replaces this.
// Keep the shape of getWeekData()'s return value the same when swapping.

// Dates are generated relative to "today" so the screen always has live-looking data.
function dayOffset(offset) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
  }
  
  const TASKS = [
    { id: 't1', title: 'Reply to Prof. Hartmann about project demo', date: dayOffset(0), dueTime: '15:00', source: 'gmail',    completed: false, firstStep: 'Open the email and hit reply' },
    { id: 't2', title: 'CS160 implementation writeup outline',       date: dayOffset(0), dueTime: '20:00', source: 'manual',   completed: false, firstStep: 'Create the doc and paste the headers' },
    { id: 't3', title: 'Pay July rent',                              date: dayOffset(0), dueTime: '23:59', source: 'gmail',    completed: true,  firstStep: 'Open the payment portal' },
    { id: 't4', title: 'Submit work timesheet',                      date: dayOffset(1), dueTime: '12:00', source: 'gmail',    completed: false, firstStep: 'Open the timesheet link' },
    { id: 't5', title: 'Ship This Week screen',                      date: dayOffset(1), dueTime: '18:00', source: 'manual',   completed: false, firstStep: 'git pull and open ThisWeek.jsx' },
    { id: 't6', title: 'Read ch. 4 for exam',                        date: dayOffset(2), dueTime: '21:00', source: 'manual',   completed: false, firstStep: 'Open the PDF to page 61' },
    { id: 't7', title: 'RSVP to research group social',              date: dayOffset(3), dueTime: '17:00', source: 'gmail',    completed: false, firstStep: 'Open the invite and click yes/no' },
    { id: 't8', title: 'Notifications feature for Anchor',           date: dayOffset(3), dueTime: '19:00', source: 'manual',   completed: false, firstStep: 'Ask for notification permission on load' },
    { id: 't9', title: 'Problem set 6',                              date: dayOffset(4), dueTime: '23:59', source: 'calendar', completed: false, firstStep: 'Write your name on question 1' },
    { id: 't10', title: 'Testing report: 2 feature + 5 stress tests', date: dayOffset(4), dueTime: '20:00', source: 'manual',  completed: false, firstStep: 'Copy the report template' },
  ]
  
  const EVENTS = [
    { id: 'e1', title: 'CS160 lecture',            date: dayOffset(0), start: '10:00', end: '11:30', source: 'calendar' },
    { id: 'e2', title: 'Work shift',               date: dayOffset(1), start: '13:00', end: '17:00', source: 'calendar' },
    { id: 'e3', title: 'Team sync — Anchor',       date: dayOffset(2), start: '18:00', end: '18:30', source: 'calendar' },
    { id: 'e4', title: 'Midterm review session',   date: dayOffset(3), start: '16:00', end: '17:30', source: 'calendar' },
    { id: 'e5', title: 'CS160 lecture',            date: dayOffset(4), start: '10:00', end: '11:30', source: 'calendar' },
    { id: 'e6', title: 'Anchor M4 due',            date: dayOffset(4), start: '23:59', end: '23:59', source: 'calendar' },
  ]
  
  // Flip to true (or add ?fail to the URL) to preview the error state.
  const SIMULATE_ERROR = false
  
  export function getWeekData() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const forceFail =
          SIMULATE_ERROR || window.location.href.includes('fail')
        if (forceFail) {
          reject(new Error('Could not load your week'))
        } else {
          resolve({ tasks: TASKS, events: EVENTS })
        }
      }, 700) // fake network latency so the loading state is visible
    })
  }