import { useEffect, useState } from 'react'

// Two independent choices that both land on the same CSS variables:
//   accent  — which colour the buttons and highlights use (Settings)
//   dark    — light or dark surfaces (sun/moon in the header)
//
// They have to be applied together, because the accent tier needs different
// values per mode: #44512E reads as a rich green on cream, but on a near-black
// page it disappears. So each theme carries a `dark` set with a lighter accent
// and dark text on it (--green-ink flips), plus a deep tint for --card-alt.

export const colorThemes = [
  {
    id: 'sage',
    label: 'Sage',
    emoji: '🌿',
    vars: { '--green': '#44512E', '--green-ink': '#F5F2E8', '--card-alt': '#E2E8D6' },
    darkVars: { '--green': '#93AC6B', '--green-ink': '#1B1E17', '--card-alt': '#2B3323' },
  },
  {
    id: 'lavender',
    label: 'Lavender',
    emoji: '🪻',
    vars: { '--green': '#8C7BA6', '--green-ink': '#F5F2E8', '--card-alt': '#EDE7F2' },
    darkVars: { '--green': '#B9A9D2', '--green-ink': '#1B1E17', '--card-alt': '#2E2937' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    vars: { '--green': '#647C94', '--green-ink': '#F5F2E8', '--card-alt': '#E7EDF2' },
    darkVars: { '--green': '#95B2CA', '--green-ink': '#1B1E17', '--card-alt': '#242E37' },
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    emoji: '🍊',
    vars: { '--green': '#B96A3C', '--green-ink': '#F5F2E8', '--card-alt': '#F6E6D7' },
    darkVars: { '--green': '#DB9260', '--green-ink': '#1B1E17', '--card-alt': '#372A21' },
  },
]

const THEME_KEY = 'anchor-color-theme'
const DARK_KEY = 'anchor-dark-mode'
const DEFAULT_THEME = 'sage'

// Matches --page in tokens.css for each mode, so the phone's browser chrome
// (status bar tint) follows the app instead of staying cream at night.
const CHROME = { light: '#F1EEE4', dark: '#1B1E17' }

let themeId = DEFAULT_THEME
let dark = false
const listeners = new Set()

function apply() {
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'

  const theme = colorThemes.find((t) => t.id === themeId) || colorThemes[0]
  for (const [key, value] of Object.entries(dark ? theme.darkVars : theme.vars)) {
    root.style.setProperty(key, value)
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? CHROME.dark : CHROME.light)

  listeners.forEach((fn) => fn())
}

// Call once before the app renders, so the saved choices are in place before
// first paint instead of flashing the default palette.
export function initThemeColor() {
  themeId = localStorage.getItem(THEME_KEY) || DEFAULT_THEME
  dark = localStorage.getItem(DARK_KEY) === 'true'
  apply()
}

// Re-render whichever components are showing theme state when it changes
// anywhere — the header toggle and the Settings picker stay in step.
function useThemeSubscription() {
  const [, force] = useState(0)
  useEffect(() => {
    const listener = () => force((n) => n + 1)
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])
}

export function useThemeColor() {
  useThemeSubscription()

  function setThemeId(next) {
    themeId = next
    localStorage.setItem(THEME_KEY, next)
    apply()
  }

  return [themeId, setThemeId]
}

export function useDarkMode() {
  useThemeSubscription()

  function setDark(next) {
    dark = next
    localStorage.setItem(DARK_KEY, String(next))
    apply()
  }

  return [dark, setDark]
}

// Which accent swatch to show for a theme in the mode that's active.
export function themeSwatch(theme) {
  return (dark ? theme.darkVars : theme.vars)['--green']
}
