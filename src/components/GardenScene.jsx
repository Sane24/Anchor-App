// The garden illustration. One hand-drawn SVG landscape, layered back to
// front: sky, hills, meadow, the oak, wildflowers, then the pond with its
// lilies and koi. Everything that "grows" is passed in as props so the scene
// stays a pure drawing — all counting lives in Garden.jsx.
//
// Colors are literal nature tones (not the accent tokens) so switching the
// app theme to Lavender doesn't turn the oak purple.
//
// Structure rule: positioning lives on a plain outer <g transform=...>;
// animation classes (.g-pop, .g-sway, ...) go on inner groups only. CSS
// transform animations override the transform attribute, so mixing them on
// one element throws the artwork to the origin.

const FLOWER_SLOTS = [
  { x: 152, y: 150, s: 1.0, sway: 0.0 },
  { x: 178, y: 158, s: 0.88, sway: 0.7 },
  { x: 201, y: 148, s: 1.05, sway: 1.4 },
  { x: 226, y: 157, s: 0.82, sway: 0.3 },
  { x: 250, y: 149, s: 0.96, sway: 1.1 },
  { x: 274, y: 158, s: 0.86, sway: 1.8 },
  { x: 298, y: 150, s: 1.0, sway: 0.5 },
  { x: 322, y: 158, s: 0.9, sway: 1.5 },
  { x: 128, y: 160, s: 0.84, sway: 0.9 },
  { x: 340, y: 150, s: 0.8, sway: 0.2 },
]

const LILY_SLOTS = [
  { x: 196, y: 208, s: 1.0 },
  { x: 296, y: 200, s: 0.9 },
  { x: 238, y: 228, s: 1.05 },
  { x: 322, y: 224, s: 0.85 },
]

const KOI_SLOTS = [
  { x: 218, y: 200, r: -18, color: 'orange', dur: 11 },
  { x: 262, y: 214, r: 8, color: 'cream', dur: 13 },
  { x: 292, y: 230, r: 168, color: 'rust', dur: 10 },
  { x: 240, y: 236, r: -155, color: 'orange', dur: 14 },
  { x: 318, y: 208, r: 120, color: 'cream', dur: 12 },
  { x: 186, y: 226, r: 32, color: 'rust', dur: 15 },
]

const GRASS_TUFTS = [
  { x: 120, y: 142, s: 1 },
  { x: 250, y: 170, s: 0.9 },
  { x: 310, y: 168, s: 1.1 },
  { x: 148, y: 178, s: 0.85 },
  { x: 96, y: 164, s: 1 },
  { x: 205, y: 168, s: 0.8 },
]

function Petals({ count, rx, ry, fill, stroke }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <ellipse
          key={i}
          cx="0"
          cy={-ry}
          rx={rx}
          ry={ry}
          fill={fill}
          stroke={stroke}
          strokeWidth="0.4"
          transform={`rotate(${(360 / count) * i})`}
        />
      ))}
    </g>
  )
}

function Flower({ x, y, s, sway, species, delay }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="g-pop" style={{ '--delay': `${delay}s` }}>
        <g className="g-sway" style={{ '--sway-delay': `${sway}s` }}>
          <path d="M0 0 C 1 -7, -1 -13, 0 -19" fill="none" stroke="#5F7345" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M0 -8 C -4 -9, -6 -12, -6.5 -14 C -3.5 -13.5, -1 -11.5, 0 -8 Z" fill="#6B7C4E" />
          {species === 'poppy' && (
            <g transform="translate(0 -22)">
              <Petals count={5} rx={3} ry={4.4} fill="#CD7B58" stroke="#B9663F" />
              <circle r="2.1" fill="#57452F" />
            </g>
          )}
          {species === 'daisy' && (
            <g transform="translate(0 -22)">
              <Petals count={7} rx={2.4} ry={4.6} fill="#F7F1DC" stroke="#E4DCC2" />
              <circle r="2.4" fill="#E2BE59" />
            </g>
          )}
          {species === 'bell' && (
            <g transform="translate(0 -19) rotate(14)">
              <path
                d="M-3.6 -3 C -3.6 -8.2, 3.6 -8.2, 3.6 -3 L 2.5 1.4 C 1 0.5, -1 0.5, -2.5 1.4 Z"
                fill="#93A3BB"
                stroke="#7E8FA9"
                strokeWidth="0.5"
              />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

function LilyPad({ x, y, s, bloom, delay }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="g-pop" style={{ '--delay': `${delay}s` }}>
        <g className="g-bob" style={{ '--sway-delay': `${delay}s` }}>
          <path
            d="M -9 0 A 9 5.6 0 1 0 9 0 A 9 5.6 0 1 0 -9 0 M 0 0 L 8 -3.4 L 8.6 0.8 Z"
            fill="#66814B"
            fillRule="evenodd"
          />
          {bloom && (
            <g transform="translate(-1 -3)">
              <Petals count={6} rx={2.1} ry={3.6} fill="#ECC2CD" stroke="#DBA6B4" />
              <circle r="1.6" fill="#F6E7EA" />
            </g>
          )}
        </g>
      </g>
    </g>
  )
}

const KOI_COLORS = {
  orange: { body: '#D98E4A', fin: '#C97B39', spot: null },
  cream: { body: '#F2E4C7', fin: '#E3CFA8', spot: '#D98E4A' },
  rust: { body: '#C96F45', fin: '#B35E36', spot: '#F2E4C7' },
}

function Koi({ x, y, r, color, dur, delay }) {
  const c = KOI_COLORS[color]
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <g className="g-pop" style={{ '--delay': `${delay}s` }}>
        <g className="g-glide" style={{ '--dur': `${dur}s`, '--sway-delay': `${delay}s` }}>
          {/* tail */}
          <path d="M0 0 C -3 -1, -4.5 -3.2, -6.2 -4.4 C -4.2 -1.4, -4.2 1.4, -6.2 4.4 C -4.5 3.2, -3 1, 0 0 Z" fill={c.fin} />
          {/* body, nose pointing +x */}
          <path d="M-0.5 0 C 3.5 -3.6, 9.5 -3.2, 13 0 C 9.5 3.2, 3.5 3.6, -0.5 0 Z" fill={c.body} />
          {/* side fins */}
          <ellipse cx="5.5" cy="-3.4" rx="2" ry="1" fill={c.fin} transform="rotate(-28 5.5 -3.4)" />
          <ellipse cx="5.5" cy="3.4" rx="2" ry="1" fill={c.fin} transform="rotate(28 5.5 3.4)" />
          {c.spot && <circle cx="7" cy="-0.4" r="1.7" fill={c.spot} />}
        </g>
      </g>
    </g>
  )
}

function GrassTuft({ x, y, s }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      stroke="#98AC76"
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
    >
      <path d="M0 0 C -0.8 -2.4, -2 -3.6, -3 -4.6" />
      <path d="M0 0 C 0 -2.6, 0.2 -4, 0.2 -5.8" />
      <path d="M0 0 C 0.8 -2.4, 2 -3.4, 3.2 -4.2" />
    </g>
  )
}

function Oak({ stage }) {
  // Anchored at the top of the hillock; grows upward from (0,0).
  return (
    <g transform="translate(64 130)">
      <g className="g-pop">
        {stage === 0 && (
          <g transform="scale(1.35)">
            <ellipse cx="0" cy="1.4" rx="6" ry="2.2" fill="#8A7355" opacity="0.5" />
            <path d="M0 1 C 0.5 -2, -0.5 -4, 0 -6" fill="none" stroke="#5F7345" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M0 -5 C -3 -6, -4.5 -8.5, -5 -10 C -2 -9.5, -0.5 -7.5, 0 -5 Z" fill="#77894F" />
            <path d="M0 -5 C 3 -6, 4.5 -8.5, 5 -10 C 2 -9.5, 0.5 -7.5, 0 -5 Z" fill="#8CA061" />
          </g>
        )}
        {stage === 1 && (
          <g className="g-sway">
            <path d="M0 1 C 1 -5, -1 -9, 0 -14" fill="none" stroke="#5F7345" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M0 -7 C -4 -8, -6.5 -11, -7 -13.5 C -3.5 -13, -1 -10, 0 -7 Z" fill="#77894F" />
            <path d="M0 -10 C 4 -11, 6.5 -14, 7 -16.5 C 3.5 -16, 1 -13, 0 -10 Z" fill="#8CA061" />
            <path d="M0 -13 C -3 -14.5, -4.5 -17, -4.8 -19 C -2 -18, -0.5 -15.5, 0 -13 Z" fill="#66793F" />
          </g>
        )}
        {stage >= 2 && (
          <g>
            {/* trunk thickens with age */}
            {stage === 2 && (
              <path d="M-1.2 1 C -1 -8, -0.8 -16, 0 -22 C 0.8 -16, 1 -8, 1.2 1 Z" fill="#7B5B41" stroke="#7B5B41" strokeWidth="1.4" strokeLinejoin="round" />
            )}
            {stage === 3 && (
              <g fill="none" stroke="#7B5B41" strokeLinecap="round">
                <path d="M0 1 C -0.5 -10, 0 -20, 0 -28" strokeWidth="4" />
                <path d="M0 -16 C 4 -20, 7 -23, 9 -27" strokeWidth="2.2" />
              </g>
            )}
            {stage >= 4 && (
              <g fill="none" stroke="#7B5B41" strokeLinecap="round">
                <path d="M0 1 C -0.8 -12, 0 -22, 0 -32" strokeWidth="6" />
                <path d="M0 -18 C 5 -23, 9 -26, 12 -31" strokeWidth="2.6" />
                <path d="M0 -20 C -5 -24, -9 -28, -11 -32" strokeWidth="2.6" />
              </g>
            )}

            <g className="g-breathe">
              {stage === 2 && (
                <g>
                  <circle cx="-4" cy="-26" r="9" fill="#77894F" />
                  <circle cx="5" cy="-29" r="8" fill="#8CA061" />
                  <circle cx="0" cy="-34" r="7" fill="#66793F" />
                </g>
              )}
              {stage === 3 && (
                <g>
                  <circle cx="-8" cy="-31" r="12" fill="#66793F" />
                  <circle cx="9" cy="-34" r="11" fill="#8CA061" />
                  <circle cx="0" cy="-41" r="11" fill="#77894F" />
                </g>
              )}
              {stage >= 4 && (
                <g>
                  <circle cx="-13" cy="-34" r="14" fill="#66793F" />
                  <circle cx="13" cy="-37" r="13" fill="#8CA061" />
                  <circle cx="0" cy="-46" r="14" fill="#77894F" />
                  <circle cx="-3" cy="-33" r="12" fill="#7C8F55" />
                  {stage >= 5 && (
                    <g fill="#EFC7D0">
                      <circle cx="-16" cy="-40" r="2" />
                      <circle cx="-7" cy="-50" r="2.2" />
                      <circle cx="4" cy="-54" r="1.8" />
                      <circle cx="14" cy="-44" r="2.2" />
                      <circle cx="19" cy="-34" r="1.7" />
                      <circle cx="-10" cy="-28" r="1.8" />
                      <circle cx="8" cy="-33" r="2" />
                    </g>
                  )}
                </g>
              )}
            </g>
          </g>
        )}
      </g>
    </g>
  )
}

function Butterfly() {
  return (
    <g transform="translate(160 118)">
      <g className="g-flutter">
        <ellipse cx="-2.6" cy="-1" rx="2.8" ry="1.9" fill="#E5B64E" transform="rotate(-24 -2.6 -1)" />
        <ellipse cx="2.6" cy="-1" rx="2.8" ry="1.9" fill="#EFC66B" transform="rotate(24 2.6 -1)" />
        <path d="M0 -3 L 0 2" stroke="#57452F" strokeWidth="1" strokeLinecap="round" />
      </g>
    </g>
  )
}

function Dragonfly() {
  return (
    <g transform="translate(310 184)">
      <g className="g-flutter" style={{ '--sway-delay': '1.2s' }}>
        <path d="M-1 0 L 6 1" stroke="#7E8FA9" strokeWidth="1.3" strokeLinecap="round" />
        <ellipse cx="-1.5" cy="-2" rx="4" ry="1.3" fill="#C6D3DE" opacity="0.85" transform="rotate(-30 -1.5 -2)" />
        <ellipse cx="-1.5" cy="2" rx="4" ry="1.3" fill="#C6D3DE" opacity="0.85" transform="rotate(30 -1.5 2)" />
      </g>
    </g>
  )
}

export default function GardenScene({ oakStage, flowers, lilies, koi, showButterfly, showDragonfly }) {
  return (
    <svg
      className="garden-scene"
      viewBox="0 0 360 252"
      role="img"
      aria-label={`Garden scene: an oak at stage ${oakStage + 1} of 6, ${flowers.length} wildflowers, ${lilies} water lilies and ${koi} koi in the pond.`}
    >
      <defs>
        <linearGradient id="garden-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3EEDC" />
          <stop offset="1" stopColor="#E9EBD4" />
        </linearGradient>
        <linearGradient id="garden-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9D3A8" />
          <stop offset="1" stopColor="#AEBD8C" />
        </linearGradient>
        <linearGradient id="garden-water" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#A9C2B8" />
          <stop offset="1" stopColor="#87AB9D" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="360" height="140" fill="url(#garden-sky)" />
      <circle cx="298" cy="42" r="30" fill="#EFD98F" opacity="0.3" />
      <circle cx="298" cy="42" r="19" fill="#EFD98F" />
      <g fill="#FBF8EC" opacity="0.9">
        <ellipse cx="76" cy="38" rx="20" ry="7" />
        <ellipse cx="94" cy="33" rx="14" ry="6" />
        <ellipse cx="190" cy="58" rx="16" ry="5.5" />
      </g>

      {/* hills + meadow */}
      <path d="M0 116 Q 70 88, 140 110 T 360 104 V 252 H 0 Z" fill="#D9DFC2" />
      <path d="M110 122 Q 220 96, 360 116 V 252 H 110 Z" fill="#CCD6B2" />
      <path d="M0 128 Q 90 112, 180 122 T 360 118 V 252 H 0 Z" fill="url(#garden-meadow)" />

      {/* hillock and the oak */}
      <path d="M4 152 Q 64 114, 124 152 Q 94 160, 64 160 Q 34 160, 4 152 Z" fill="#BCC99B" opacity="0.75" />
      <Oak stage={oakStage} />

      {/* scattered grass */}
      {GRASS_TUFTS.map((tuft, i) => (
        <GrassTuft key={i} {...tuft} />
      ))}

      {/* wildflowers, one per landed anchor */}
      {flowers.map((flower, i) => {
        const slot = FLOWER_SLOTS[i]
        return slot ? (
          <Flower key={flower.id} {...slot} species={flower.species} delay={0.15 + i * 0.08} />
        ) : null
      })}

      {/* pond */}
      <g>
        <path
          d="M150 202 C 164 184, 214 176, 260 179 C 312 182, 352 192, 357 210 C 360 228, 322 244, 266 246 C 208 248, 158 240, 148 222 C 145 214, 145 208, 150 202 Z"
          fill="#D6D0AC"
        />
        <path
          d="M156 204 C 170 189, 216 182, 259 185 C 306 188, 344 196, 349 211 C 352 226, 318 239, 265 241 C 212 243, 166 236, 157 221 C 154 214, 154 210, 156 204 Z"
          fill="url(#garden-water)"
        />
        <ellipse cx="230" cy="204" rx="46" ry="12" fill="#B7CEC2" opacity="0.4" />
        <ellipse className="g-ripple" cx="252" cy="214" rx="14" ry="5" fill="none" stroke="#EAF2EA" strokeWidth="1" />
        <ellipse className="g-ripple g-ripple-late" cx="308" cy="222" rx="10" ry="4" fill="none" stroke="#EAF2EA" strokeWidth="1" />

        {KOI_SLOTS.slice(0, koi).map((slot, i) => (
          <Koi key={i} {...slot} delay={0.3 + i * 0.1} />
        ))}
        {LILY_SLOTS.map((slot, i) =>
          i < Math.max(lilies, 1) ? (
            <LilyPad key={i} {...slot} bloom={i < lilies} delay={0.2 + i * 0.12} />
          ) : null
        )}
      </g>

      {/* reeds on the near bank */}
      <g className="g-sway" style={{ '--sway-delay': '0.4s' }}>
        <g stroke="#6B7C4E" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M158 232 C 157 220, 158 210, 157 200" />
          <path d="M166 236 C 166 224, 167 216, 166 206" />
          <path d="M150 228 C 150 220, 151 214, 150 208" />
        </g>
        <g fill="#8A6A4A">
          <rect x="155.4" y="192" width="3.2" height="9" rx="1.6" />
          <rect x="164.4" y="198" width="3.2" height="9" rx="1.6" />
        </g>
      </g>

      {showButterfly && <Butterfly />}
      {showDragonfly && <Dragonfly />}
    </svg>
  )
}
