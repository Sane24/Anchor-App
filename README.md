# Anchor

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
cp .env.example .env    # first time only — Google sign-in needs this
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
    GardenScene.jsx     the hand-drawn SVG garden landscape (Garden tab)
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
    tokens.css          colors, fonts, logo, spacing — from the Figma
    app.css             app shell, header, tab bar, cards
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

Every screen currently renders a `<Placeholder />`. Replace it with real content.
Use the existing classes so everything stays consistent:

- `.screen` — the page wrapper (already there, keep it)
- `.card` — standard cream card
- `.card-sage` — the sage highlight card
- `.eyebrow` — small caps label
- `.screen-title` — serif section heading

Colors and fonts come from CSS variables in `tokens.css` — use
`var(--green)`, `var(--ink-soft)`, etc. Don't hardcode hex values.


## Working together rules (git)

1. **Pull before you start.** `git pull` — every single time you sit down.
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


