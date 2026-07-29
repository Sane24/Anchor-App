import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCalendarEvents, fetchGmailAsTasks } from '../data/googleData'
import { getStoredGoogleToken } from '../data/googleAuth'

export default function Briefing() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'gmail' | 'calendar'
  const [selectedIds, setSelectedIds] = useState([])
  const [customTaskText, setCustomTaskText] = useState('')

  useEffect(() => {
    async function loadItems() {
      if (!getStoredGoogleToken()) {
        setLoading(false)
        return
      }
      const [events, emails] = await Promise.all([
        fetchCalendarEvents(),
        fetchGmailAsTasks(),
      ])
      const calendarItems = events.map((e) => ({
        id: `cal-${e.id}`,
        title: e.title,
        source: 'calendar',
      }))
      const gmailItems = emails.map((e) => ({
        id: `mail-${e.id}`,
        title: e.title,
        source: 'gmail',
      }))
      setItems([...calendarItems, ...gmailItems])
      setLoading(false)
    }
    loadItems()
  }, [])

  const visibleItems =
    filter === 'gmail'
      ? items.filter((i) => i.source === 'gmail')
      : filter === 'calendar'
      ? items.filter((i) => i.source === 'calendar')
      : items

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev // cap at 3
      return [...prev, id]
    })
  }

  function addCustomTask() {
    if (!customTaskText.trim()) return
    const newItem = {
      id: `custom-${Date.now()}`,
      title: customTaskText.trim(),
      source: 'custom',
    }
    setItems((prev) => [...prev, newItem])
    setCustomTaskText('')
  }

  function saveTop3() {
    const chosen = items.filter((i) => selectedIds.includes(i.id))
    // TEMP: using localStorage until src/store.js exists.
    // Key name: anchor_today_tasks — flag with teammate who owns store.js
    localStorage.setItem('anchor_today_tasks', JSON.stringify(chosen))
    navigate('/')
  }

  return (
    <div className="screen">
      <h2 className="screen-title">Morning briefing</h2>

      {!getStoredGoogleToken() && (
        <div className="card">
          <p>Connect Google in Settings to pull in Calendar and Gmail items.</p>
        </div>
      )}

      {loading && <p>Loading...</p>}

      {!loading && getStoredGoogleToken() && (
        <>
          <div className="card">
            <p className="eyebrow">Filter</p>
            <button onClick={() => setFilter('all')} disabled={filter === 'all'}>
              All
            </button>
            <button onClick={() => setFilter('calendar')} disabled={filter === 'calendar'}>
              Calendar only
            </button>
            <button onClick={() => setFilter('gmail')} disabled={filter === 'gmail'}>
              Gmail only
            </button>
          </div>

          <div className="card">
            <p className="eyebrow">Review & select up to 3</p>
            {visibleItems.length === 0 && <p>Nothing to review right now.</p>}
            {visibleItems.map((item) => (
              <div key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    disabled={!selectedIds.includes(item.id) && selectedIds.length >= 3}
                  />
                  {item.title}
                  <span> ({item.source})</span>
                </label>
              </div>
            ))}
          </div>

          <div className="card">
            <p className="eyebrow">Add your own task</p>
            <input
              type="text"
              value={customTaskText}
              onChange={(e) => setCustomTaskText(e.target.value)}
              placeholder="e.g. Call the dentist"
            />
            <button onClick={addCustomTask}>Add</button>
          </div>

          <button onClick={saveTop3} disabled={selectedIds.length === 0}>
            Save top {selectedIds.length}/3 to Today
          </button>
        </>
      )}
    </div>
  )
}