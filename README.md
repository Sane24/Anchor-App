# Anchor
Anchor, is an ADHD/anxiety-focused executive-function co-pilot that helps people regulate focus, motivation, and emotional state while studying or working.

The app is designed for people with ADHD, anxiety, depression, or similar focus and motivation struggles, especially when breakdowns like doomscrolling, avoidance, emotional overwhelm, and task paralysis get in the way.

Steady the day. Turn scattered obligations into three small, startable anchors.
Pull all tasks and events from google calendar and gmail.

CS160 Summer 2026 final project.

Between revising for the upcoming quiz, finishing other
assignments across multiple classes, and managing commitments outside
of school, when you do not even know where to begin, and doomscrolling will not
help you progress any further. Introducing to you, Anchor, an application that is built to help you in these times of decision fatigue. Instead of being overwhelmed with listing your endless amount of tasks and having them lost after , Anchor operates on a
simple, grounded philosophy: you will steady the day by limiting your daily
focus to 3 core tasks, or what we like to call, "Anchors."
As you constrain your daily targets to what matters most on the current
day, Anchor will break the paralysis of what to start, reduce cognitive
overload, and help turn your stressful and chaotic study sessions into
calm, intentional progress.
Intended Users: Students, recent graduates, and independent learners
looking for a minimalist, low-friction task management tool that prioritizes
clarity, focus, and daily reflection over endless accumulation of stress.

## What it does

**Today** — your three Anchors for the day, each with one small first step.
Check them off, swipe to complete or delete, push one to tomorrow, or tap
"I started" — starting counts. Underneath: what's actually due today, and
what's on your calendar.

**Morning briefing** — scans your calendar and unread mail, puts everything on
one page, and asks you to pick up to three. Each pick gets a suggested first
step you can edit or reshuffle. Last night's note to yourself sits at the top.

**This Week** — the next seven days on one scrolling page, with a strip to jump
between them. The weekly briefing scans seven days of calendar and mail at
once. Anything on the week can be added, edited, or deleted.

**Focus sprint** — a Pomodoro cycle (focus, short break, long break every four
rounds) on a dial you can scroll, drag, or arrow-key. The timer keeps running
when you leave the screen and survives a refresh. Optional ambient sound:
white noise, brown noise, rain, or a cafe.

**Reflection** — close the day. See what landed, then decide for each
unfinished Anchor: move it to tomorrow, or let it go on purpose. Leave a note
for tomorrow-you, log sleep and steps, and drop one thing into the morning so
you never start from a blank page.

**Garden** — a small world that grows out of what you actually did. Focus
minutes grow an oak, landed Anchors bloom as wildflowers (a different species
per source), comebacks open water lilies, and every sprint adds a koi to the
pond. Walk into it and tap anything to see which task grew it.

**Throughout** — reminders for the morning briefing and the night reflection,
with an in-app catch-up if you missed the window; dark mode and accent themes;
and an optional account that syncs plans, journal, and sessions across devices.
The whole app works signed out.

## Tech stack

React 18 + Vite, React Router (HashRouter, so it deploys to GitHub Pages),
Supabase for accounts and sync, read-only Google Calendar and Gmail APIs, and
the Web Audio API for the ambient sound. No backend of our own.

## Docs

- [Official User Manual](%5BAnchor%5D%20Official%20User%20Manual.pdf) — the full walkthrough, screen by screen
- [Privacy policy](privacy-policy.md) — what Anchor reads from your Google account, and what it does with it

## FAQs

1)Can other users see my tasks or progress?
No. Your plans, reflections, and focus sessions are private to your
account.
2) What happens to tasks I don't complete?
They roll over automatically and appear as suggestions in the next
day's Morning Briefing.
3) Can I add another task after having three added already?
You can only add at most 3 tasks to start with, as we don't want you to be
overwhelmed with too many tasks.

## Run it

Need Node 18+ installed.

```bash
npm install
cp .env.example .env    # first time only — Google sign-in and sync need this
npm run dev
```

Open the URL it prints (usually http://localhost:5173). Use your browser's
device toolbar at ~390px wide as this is a mobile app.

```bash
npm run build     # production build into dist/
npm run preview   # preview the production build
```

### Accounts and sync (optional)

Signing in is optional — without it Anchor keeps everything in your browser and
every screen still works. Sync needs a Supabase project:

1. Run `supabase/schema.sql` in your project's SQL editor. It creates the three
   tables (`day_plans`, `journal_entries`, `focus_sessions`) and the row-level
   security policies that make each user's rows readable only by that user. The
   file is safe to re-run.
2. Put your project URL and publishable key in `.env` as `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_ANON_KEY`.

localStorage stays the source of truth either way. Signing in pulls your
account's data down, merges it with whatever is already on the device, and
mirrors later writes up in the background. Signing out just stops the
mirroring — nothing local is deleted.

## Where things live

```
src/
  main.jsx              entry point — router, Google provider, theme init
  App.jsx               all routes + auth session wiring
  store.js              localStorage source of truth: day plans, journal, sessions
  firstSteps.js         keyword → smallest-first-step suggestions
  notifications.js      reminder scheduler + in-app catch-up layer
  components/
    AppHeader.jsx       logo (home), user name, ambient sound, dark-mode toggle
    TabBar.jsx          the 5 bottom tabs
    GardenScene.jsx     the hand-drawn SVG garden landscape
    GardenImmersive.jsx full-screen walk-in garden, tap anything to read its story
    TimerPopup.jsx      mini countdown shown on the other tabs
    ReminderNudge.jsx   catch-up reminder banner
    NotificationSettings.jsx  reminder card inside Settings
    AmbientSoundSheet.jsx     white / brown / cafe / rain picker
    SwipeRow.jsx        swipe to complete or delete
    icons.jsx           all inline SVG icons
  screens/
    Today.jsx           TAB 1 — top 3 anchors, due today, calendar
    Garden.jsx          TAB 2 — progression grown from real sessions
    ThisWeek.jsx        TAB 3 — 7-day view + weekly briefing
    Reflection.jsx      TAB 4 — night close-out, rollover, journal
    Settings.jsx        TAB 5 — account, theme, reminders, Google
    Briefing.jsx        morning briefing — opened from Today, not a tab
    Timer.jsx           focus sprint — opened from an anchor, not a tab
    Auth.jsx            sign in / sign up / reset password
    weekSampleData.js   week data layer: samples, Google imports, user edits
  data/
    googleAuth.js       Google OAuth token handling
    googleData.js       read-only Gmail + Calendar scans
    gmailFilter.js      which unread mail is worth becoming a task
    sync.js             optional Supabase mirror (local-first)
  hooks/
    useFocusSession.jsx timer state, lives above the router so it survives tabs
    useAmbientSound.js  Web Audio ambience — no audio files shipped
    useThemeColor.js    dark mode + accent themes
  lib/
    supabaseClient.js   Supabase client
  styles/
    tokens.css          colors, fonts, spacing — from the Figma
    app.css             app shell, header, tab bar, cards
    week.css            This Week screen
supabase/
  schema.sql            tables + row-level security for account sync
public/                 icons and manifest — installable on a phone
```

## Files

Work only in your own files. If you need a change in a shared file, ask its owner.

| Area | Files 
|---|---|
| Today screen + check-off + tab bar | `screens/Today.jsx`, `components/TabBar.jsx` 
| Design tokens | `styles/tokens.css`, `styles/app.css` 
| Morning briefing + connections | `screens/Briefing.jsx`, `screens/Settings.jsx` 
| Gmail / Calendar data | `src/data/` (to be added) 
| Reflection + rollover | `screens/Reflection.jsx` 
| Save/load code + focus timer + 1st step suggestion | `src/store.js` (to be added), `screens/Timer.jsx` 
| This Week  | `screens/ThisWeek.jsx`, 
| Garden + deploy | `screens/Garden.jsx`

## Building your screen


- `.screen` — the page wrapper (already there, keep it)
- `.card` — standard cream card
- `.card-sage` — the sage highlight card
- `.eyebrow` — small caps label
- `.screen-title` — serif section heading

Colors and fonts come from CSS variables in `tokens.css` — use
`var(--green)`, `var(--ink-soft)`, etc. Don't hardcode hex values.


## Working together rules (git)

1. **Pull before you start.** `git pull` — every single time you start.
2. **Pull again before you push.** Someone probably pushed while you worked.
3. **Push when you finish a chunk**, not once at the end of the day.

```bash
git pull # before you start
# ...do your work...
git pull # again, right before pushing
git add .
git commit -m "Add first-step suggestions to briefing"
git push
```

**Commit messages:** say what changed, in plain words, present tense.
Good: `Add check-off to Today anchors`. Bad: `updates`, `fix`, `asdf`.

**Commit small and often.** One feature per commit. Easier to undo, easier to review.

**If you get a merge conflict:** don't force anything.
Message the group, usually it's a 2-minute fix with the other person.

**Never push broken code to main.** Run `npm run dev` and click through
your screen before you push. If it doesn't load, don't push it.

**Never commit `node_modules`.** It's in `.gitignore` already — leave it there.

**Don't touch files you don't own.** 

**Don't reformat or reorganize someone else's file.** 


