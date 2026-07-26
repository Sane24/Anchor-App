# Anchor

Steady the day. Turn scattered obligations into three small, startable anchors.

CS160 Summer 2026 final project.

## Run it

You need Node 18+ installed.

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Use your browser's
device toolbar at ~390px wide as this is a mobile app.

```bash
npm run build     # production build into dist/
npm run preview   # preview the production build
```

## Where things live

```
src/
  main.jsx              entry point, router setup
  App.jsx               all routes in one place
  components/
    AppHeader.jsx       logo + tagline + settings link
    TabBar.jsx          the 5 bottom tabs
    Placeholder.jsx     temporary stand-in for unbuilt screens
    icons.jsx           all inline SVG icons
  screens/
    Today.jsx           TAB 1
    Garden.jsx          TAB 2
    ThisWeek.jsx        TAB 3
    Reflection.jsx      TAB 4
    Settings.jsx        TAB 5
    Briefing.jsx        opened from Today, not a tab
    Timer.jsx           opened from an anchor, not a tab
  styles/
    tokens.css          colors, fonts, spacing — from the Figma
    app.css             app shell, header, tab bar, cards
```

## Who owns what

Work only in your own files. If you need a change in a shared file, ask its owner.

| Area | Files | Owner |
|---|---|---|
| Today screen + check-off + tab bar | `screens/Today.jsx`, `components/TabBar.jsx` 
| Design tokens | `styles/tokens.css`, `styles/app.css` 
| Morning briefing + connections | `screens/Briefing.jsx`, `screens/Settings.jsx` 
| Fake Gmail / Calendar / Slack data | `src/data/` (to be added) | Thanhbinh 
| Reflection + rollover | `screens/Reflection.jsx` 
| Save/load code + focus timer + 1st step suggestion | `src/store.js` (to be added), `screens/Timer.jsx` 
| This Week  | `screens/ThisWeek.jsx`, 
| Garden + deploy | `screens/Garden.jsx`
## Building your screen

Every screen currently renders a `<Placeholder />`. Replace it with real content.
Use the existing classes so everything stays consistent:

- `.screen` — the page wrapper (already there, keep it)
- `.card` — standard cream card
- `.card-sage` — the sage highlight card
- `.eyebrow` — small caps label
- `.screen-title` — serif section heading

Colors and fonts come from CSS variables in `tokens.css` — use
`var(--green)`, `var(--ink-soft)`, etc. Don't hardcode hex values.

## Team rules

1. Work only in your own files. Shared files (`tokens.css`, `store.js`) are single-owned.
2. Stuck for 30 minutes? Message the group.
3. Short standup daily. "Done" means demoable, per the plan's done-when column.




