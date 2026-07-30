// First-step suggestions. Given a task title (and where it came from), offer
// the smallest honest way to begin — task initiation, not productivity.
// Deterministic and local on purpose: works offline, demos anywhere, and the
// same task always gets the same first idea.
//
// Matching order: title keywords (most specific) -> source habits (a Gmail
// task begins differently than a Calendar event) -> generic openers.

const KEYWORD_RULES = [
  [/reply|respond|email|inbox|\bre:/, [
    'Write the first sentence of the reply',
    'Open the thread and just read it',
  ]],
  [/essay|write|writing|draft|outline|paper|blog/, [
    'Open the doc and write one rough sentence',
    'Write the title, then three bullets',
  ]],
  [/\bread|reading|chapter|textbook|article/, [
    'Read the first paragraph only',
    'Open to the right page and skim the headings',
  ]],
  [/study|review|exam|midterm|final|quiz|flashcard/, [
    'Open the study materials',
    'Do one practice question',
  ]],
  [/leetcode|neetcode|interview prep/, [
    'Open one problem and read it twice',
    'Write the brute force first',
  ]],
  [/assignment|homework|\bhw\b|\bpset\b|problem set|\bpa\s?#?\d/, [
    'Open the starter code',
    'Re-read the prompt and mark step one',
  ]],
  [/figma|design|prototype|wireframe|mockup/, [
    'Open the project file',
    'Pick a frame and nudge one shape',
  ]],
  [/\bcode\b|\bbug\b|\bfix\b|implement|refactor|debug/, [
    'Open the repo and run it once',
    'Write one line, even a comment',
  ]],
  [/\bcall\b|phone|dial/, [
    'Find the number and open the dialer',
    'Write down your opening line',
  ]],
  [/clean|tidy|organize|declutter|laundry|dishes|desk/, [
    'Set a 5-minute timer, clear one surface',
    'Pick up the first five things',
  ]],
  [/\bgym\b|workout|exercise|\brun\b|stretch|walk/, [
    'Put on your shoes',
    'Fill your water bottle and stand up',
  ]],
  [/apply|application|register|sign.?up|\bform\b/, [
    'Open the form and type just your name',
    'Gather one document it asks for',
  ]],
  [/meeting|standup|sync|1:1|present|slides|presentation/, [
    'Write one bullet you want to bring up',
    'Open the notes from last time',
  ]],
  [/schedule|\bbook\b|appointment/, [
    'Open the calendar and pick two times',
    'Write down who to ask',
  ]],
  [/\bpay\b|\bbill\b|\bbank\b|budget|\brent\b/, [
    'Open the account and just look',
    'Pay the smallest one first',
  ]],
  [/\bbuy\b|order|grocer|shopping/, [
    'List just three things you need',
    'Put the first item in the cart',
  ]],
]

// How a task tends to begin, based on where it came from.
const SOURCE_STEPS = {
  gmail: [
    'Open the email and read it once',
    'Reply with one sentence — rough is fine',
  ],
  calendar: [
    'Write one thing you want out of it',
    'Get what you need ready ten minutes early',
  ],
  rollover: [
    'Restart with the smallest piece from yesterday',
    'Give it 5 minutes, then decide again',
  ],
}

const GENERIC_STEPS = [
  'Open what you need and work for 5 minutes',
  'Start with the first two minutes',
  'Put everything you need in front of you',
]

// Every idea for this task, best first, no duplicates.
export function firstStepIdeas(title = '', source = '') {
  const text = title.toLowerCase()
  const ideas = []
  for (const [pattern, steps] of KEYWORD_RULES) {
    if (pattern.test(text)) ideas.push(...steps)
  }
  ideas.push(...(SOURCE_STEPS[source] || []))
  ideas.push(...GENERIC_STEPS)
  return [...new Set(ideas)]
}

export function suggestFirstStep(title, source) {
  return firstStepIdeas(title, source)[0]
}

// The idea after `current`, wrapping around — powers the "try another" button.
// A hand-written step isn't in the list, so it cycles back to the best idea.
export function nextFirstStep(title, source, current) {
  const ideas = firstStepIdeas(title, source)
  return ideas[(ideas.indexOf(current) + 1) % ideas.length]
}
