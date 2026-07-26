// Placeholder icon

const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
})

export const SunIcon = ({ size = 22 }) => (
  <svg {...base(size)} aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </svg>
)

export const SproutIcon = ({ size = 22 }) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M12 21v-9" />
    <path d="M12 12C12 8.7 9.3 6 6 6c0 3.3 2.7 6 6 6Z" />
    <path d="M12 12c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6Z" />
  </svg>
)

export const CalendarIcon = ({ size = 22 }) => (
  <svg {...base(size)} aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
)

export const MoonIcon = ({ size = 22 }) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
)

export const SlidersIcon = ({ size = 22 }) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M4 7h16M4 17h16" />
    <circle cx="9" cy="7" r="2.4" />
    <circle cx="15" cy="17" r="2.4" />
  </svg>
)

// The Anchor logo mark: an anchor inside a ring.
export const AnchorMark = ({ size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="20" cy="20" r="19" />
    <circle cx="20" cy="11" r="3.2" />
    <path d="M20 14.2V29" />
    <path d="M14.5 17.5h11" />
    <path d="M11.5 22.5A8.5 8.5 0 0 0 20 29a8.5 8.5 0 0 0 8.5-6.5" />
  </svg>
)
