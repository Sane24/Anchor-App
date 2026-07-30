// icon

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

export const EditIcon = ({ size = 14 }) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18 3 19.5 4.5 15 16.5 3.5Z" />
  </svg>
)

export const RepeatIcon = ({ size = 12 }) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9M20.5 12a8.5 8.5 0 0 1-14.6 5.9" />
    <path d="M17.5 2.8v3.6h-3.6M6.5 21.2v-3.6h3.6" />
  </svg>
)

// The Anchor logo mark: a sprouting anchor on a theme-colored disc.
// Exported from the Figma Focus Sprint frame (node 61:387). Keeps that file's
// geometry exactly; only the hardcoded #2A2A24 became currentColor so it picks
// up the surrounding text colour like the other icons here.
export const SpeakerIcon = ({ size = 17 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6.375 5.66667H3.54167C3.15073 5.66667 2.83333 5.98406 2.83333 6.375V10.625C2.83333 11.0159 3.15073 11.3333 3.54167 11.3333H6.375L9.91667 14.1667V2.83333L6.375 5.66667V5.66667"
      fill="currentColor"
    />
    <path
      d="M11.6875 6.72917C12.5163 7.76428 12.5163 9.23572 11.6875 10.2708"
      stroke="currentColor"
      strokeWidth="1.275"
      strokeLinecap="round"
    />
    <path
      d="M13.4583 5.3125C14.875 7.20139 14.875 9.79861 13.4583 11.6875"
      stroke="currentColor"
      strokeWidth="1.275"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
)

export const AnchorMark = ({ size = 38 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 38 38"
    fill="none"
    aria-hidden="true"
  >
    <rect width="38" height="38" rx="19" fill="currentColor" />
    <g
      stroke="var(--green-ink)"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 15.9375V26.875" />
      <path d="M15.0625 19H22.9375" />
      <path d="M12.4375 21.625C12.4375 23.3655 13.1289 25.0347 14.3596 26.2654C15.5903 27.4961 17.2595 28.1875 19 28.1875C20.7405 28.1875 22.4097 27.4961 23.6404 26.2654C24.8711 25.0347 25.5625 23.3655 25.5625 21.625" />
      <path d="M19 15.9375C19 13.6625 20.6625 12.175 22.85 12.175C22.85 14.45 21.1875 15.9375 19 15.9375Z" />
      <path d="M19 15.9375C19 14.0125 17.6 12.7875 15.7625 12.7875C15.7625 14.7125 17.1625 15.9375 19 15.9375Z" />
    </g>
  </svg>
)
