import { useEffect, useState } from 'react'

// Sage is the original Figma palette — picking it is a no-op visually.
// Each theme only overrides the two "green tier" tokens (button/accent and
// its light card tint). Everything else — fonts, the cream page background,
// text on the accent button (--green-ink), layout — stays untouched.
export const colorThemes = [
  {
    id: 'sage',
    label: 'Sage',
    emoji: '🌿',
    vars: { '--green': '#44512E', '--card-alt': '#E2E8D6' },
  },
  {
    id: 'lavender',
    label: 'Lavender',
    emoji: '🪻',
    vars: { '--green': '#8C7BA6', '--card-alt': '#EDE7F2' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    emoji: '🌊',
    vars: { '--green': '#647C94', '--card-alt': '#E7EDF2' },
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    emoji: '🍊',
    vars: { '--green': '#B96A3C', '--card-alt': '#F6E6D7' },
  },
]

const STORAGE_KEY = 'anchor-color-theme'
const DEFAULT_THEME = 'sage'

function applyTheme(id) {
  const theme = colorThemes.find((t) => t.id === id) || colorThemes[0]
  for (const [key, value] of Object.entries(theme.vars)) {
    document.documentElement.style.setProperty(key, value)
  }
}

// Call once, before the app renders, so the saved theme is applied
// before first paint instead of flashing the default palette.
export function initThemeColor() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) applyTheme(stored)
}

export function useThemeColor() {
  const [themeId, setThemeIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME
  )

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  function setThemeId(next) {
    setThemeIdState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return [themeId, setThemeId]
}
