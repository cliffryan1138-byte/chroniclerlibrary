// Everything brand-specific for this app instance. Another instance swaps this folder, not the engine.

export const appConfig = {
  id: 'captains-cellar',
  name: "Captain's Cellar Companion",
  shortName: 'Cellar',
  minimumAge: 21,
  branches: ['cigar'] as const,
  recommendationCount: 5,
} as const

/** RGB triplets (Tailwind reads them as rgb(var(--x) / alpha)). */
export const palette = {
  light: {
    bg: '247 241 232',
    surface: '255 251 245',
    ink: '43 29 20',
    muted: '115 94 78',
    accent: '150 104 24',
    'accent-ink': '255 251 245',
    line: '226 214 198',
    danger: '150 40 40',
  },
  dark: {
    bg: '43 29 20',        // #2B1D14 deep leather
    surface: '58 40 29',
    ink: '244 234 220',
    muted: '190 168 146',
    accent: '194 145 46',   // #C2912E aged gold
    'accent-ink': '43 29 20',
    line: '84 61 45',
    danger: '230 120 110',
  },
} as const

export const fonts = {
  display: '"Cormorant Garamond", Georgia, serif',
  body: '"Source Serif 4", Georgia, serif',
}

// Voice: the unhurried host at the end of the day. Warm, a little wry, never snobbish.
export const copy = {
  eyebrow: 'Cigars',
  tagline: 'A tasting journal that learns your palate.',
  compliance: 'For adults 21 and over. A private tasting journal: it does not promote tobacco use, and nothing here is for sale.',
  ageGate: {
    title: 'Before we pour',
    body: 'This app is for adults 21 and over.',
    attest: 'I confirm I am 21 or older.',
    tooYoung: 'Sorry, you need to be 21 or older to use this app.',
  },
  quiz: {
    title: 'A quick read on your palate',
    subtitle: 'Thirty seconds. Tap what sounds good. You can change all of this later.',
    likes: 'Which of these sound good to you?',
    dislikes: 'Anything you would rather skip?',
    strength: 'How much strength do you like?',
    done: 'Start my journal',
  },
  log: {
    title: 'Log a session',
    pickItem: 'What did you have?',
    rating: 'How was it overall?',
    wouldBuyAgain: 'Would you reach for it again?',
    tags: 'What did you taste?',
    notes: 'Anything worth remembering?',
    save: 'Save to journal',
    saved: 'Logged. Your profile just got a little sharper.',
  },
  profile: {
    title: 'Your palate',
    empty: 'Log a few sessions and your palate will take shape here.',
    seedNote: 'Still leaning on your quiz answers. A few more logs and this becomes all you.',
  },
  discover: {
    title: 'You might like',
    subtitle: 'Picked from what you rate highly. No ads, no sponsors, no links to buy.',
    empty: 'Nothing left to suggest. You have logged the whole cellar.',
  },
  detailedOffer: {
    title: 'Ready for more detail?',
    body: 'You have logged enough to get picky. Detailed mode adds specific notes, flavor by third, and draw, burn, and construction scores. Your profile carries over.',
    accept: 'Turn on detailed mode',
    decline: 'Keep it simple',
  },
  demoBanner: 'Demo mode: everything is saved in this browser only.',
}
