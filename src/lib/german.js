import { fsrs, createEmptyCard, generatorParameters, Rating, State } from 'ts-fsrs'
import { toDateKey } from './date'

// Everything in this file is plain logic — no network, no API. The word
// trainer, the day plan and the reminders must keep working with no
// ANTHROPIC_API_KEY at all.

export const MAX_NEW_PER_DAY = 20
export const LEARNED_FROM_INTERVAL = 21 // "выучено" = next interval >= 21 days (FSRS "mature")

export const STARTER_GRAMMAR_TOPICS = [
  'Adjektivdeklination',
  'Präpositionen + Kasus',
  'Verben mit Präpositionen',
  'Nebensätze und Konnektoren (weil, obwohl, damit, trotzdem…)',
  'Relativsätze',
  'Passiv',
  'Konjunktiv II',
  'n-Deklination',
  'Nomen-Verb-Verbindungen'
]

export const GRAMMAR_STATUSES = ['todo', 'doing', 'review', 'known']

// One shared list of error categories — used by the writing log, the
// Lückentext drills and the AI sentence tools, so "weak spots" add up
// instead of splitting across slightly different labels.
export const ERROR_CATEGORIES = [
  'artikel',
  'nominativ',
  'akkusativ',
  'dativ',
  'genitiv',
  'adjektivendung',
  'ndeklination',
  'verb',
  'praeposition',
  'wortstellung',
  'nebensatz',
  'konjunktiv',
  'passiv',
  'wortschatz',
  'rechtschreibung',
  'stil',
  'sonstiges'
]

export const ZONES = ['vocab', 'grammar', 'writing']
export const RATING_XP = { again: 1, hard: 2, good: 3, easy: 3 }

// ---------- dates ----------

export function addDaysKey(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function daysBetween(fromKey, toKey) {
  const a = new Date(`${fromKey}T00:00:00`)
  const b = new Date(`${toKey}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

// Consecutive done-days ending today — or ending yesterday if today isn't
// done yet, so the streak doesn't read as broken before the day is over.
// A skipped day only resets this number; it never touches words/box/progress.
export function computeDayStreak(doneDates, todayKey) {
  const done = new Set(doneDates || [])
  let cursor = todayKey
  if (!done.has(cursor)) cursor = addDaysKey(cursor, -1)
  let streak = 0
  while (done.has(cursor)) {
    streak++
    cursor = addDaysKey(cursor, -1)
  }
  return streak
}

// ---------- answer checking ----------

// Case/whitespace-insensitive; ae/oe/ue/ss and ä/ö/ü/ß are folded to the
// same form on BOTH sides, so either spelling is accepted for either.
// "ё" is folded to "е" for the Russian side.
export function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isNoun(word) {
  return !!word.article
}

// What the learner sees as the German side: "der Tisch" for nouns.
export function germanDisplay(word) {
  return word.article ? `${word.article} ${word.de}` : word.de
}

// ru may hold several accepted variants: "стол; столик" / "стол, столик" / "стол / столик".
export function russianVariants(word) {
  return String(word.ru || '')
    .split(/[;,/]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

// direction: 'de-ru' | 'ru-de'. Returns { correct, missingArticle }.
// For RU→DE nouns the article is mandatory: "Tisch" alone is wrong, and
// flagged so the UI can say "нужен артикль" instead of just "неверно".
export function checkAnswer(word, direction, input) {
  const given = normalizeAnswer(input)
  if (!given) return { correct: false, missingArticle: false }

  if (direction === 'de-ru') {
    const full = normalizeAnswer(word.ru)
    const correct = given === full || russianVariants(word).some((v) => normalizeAnswer(v) === given)
    return { correct, missingArticle: false }
  }

  const expected = normalizeAnswer(germanDisplay(word))
  if (given === expected) return { correct: true, missingArticle: false }
  const missingArticle = isNoun(word) && given === normalizeAnswer(word.de)
  return { correct: false, missingArticle }
}

// ---------- FSRS ----------
// Spaced repetition on FSRS (ts-fsrs, same algorithm as modern Anki).
// enable_short_term is off: intra-day learning steps (10 min etc.) make no
// sense for a once-a-day session, so a first correct answer goes straight
// to a day-based interval. Fully local — no API involved.
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }))

export const RATINGS = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy }

function endOfDay(dateKey) {
  return new Date(`${dateKey}T23:59:59`).getTime()
}

function withDueDate(card) {
  return { ...card, dueDate: new Date(card.due).getTime() }
}

export function newSrsFields(now = new Date()) {
  return withDueDate(createEmptyCard(now))
}

export function isNewWord(word) {
  return (word.state ?? State.New) === State.New
}

export function isDue(word, todayKey) {
  return !isNewWord(word) && word.dueDate <= endOfDay(todayKey)
}

// Old Leitner-era words (box/next_review/reviewed_at, no FSRS fields) are
// converted once: reviewed words become Review cards whose stability equals
// their old interval, so nothing resets to "new".
const LEGACY_INTERVALS = [1, 2, 4, 8, 16]
export function migrateWord(word) {
  if (word.state !== undefined) return word
  const base = createEmptyCard(new Date())
  if (!word.reviewed_at) return { ...word, ...withDueDate(base) }
  const interval = LEGACY_INTERVALS[(word.box || 1) - 1]
  const due = new Date(`${word.next_review || word.reviewed_at}T09:00:00`)
  return {
    ...word,
    ...withDueDate({
      ...base,
      due,
      stability: interval,
      difficulty: 5,
      scheduled_days: interval,
      reps: word.box || 1,
      lapses: word.wrong_count || 0,
      state: State.Review,
      last_review: new Date(`${word.reviewed_at}T09:00:00`)
    })
  }
}

// rating: 'again' | 'hard' | 'good' | 'easy'
export function scheduleWord(word, rating, now = new Date()) {
  const { card } = scheduler.next(migrateWord(word), now, RATINGS[rating])
  return {
    ...word,
    ...withDueDate(card),
    reviewed_at: toDateKey(now),
    wrong_count: (word.wrong_count || 0) + (rating === 'again' ? 1 : 0)
  }
}

export function intervalDays(word) {
  return Math.max(0, Math.round(word.scheduled_days || 0))
}

// Day session: due words first (most overdue first), then new words up to
// the daily cap minus what's already been introduced today.
export function buildSession(words, todayKey, newPerDay, newIntroducedToday = 0) {
  const due = words.filter((w) => isDue(w, todayKey)).sort((a, b) => a.dueDate - b.dueDate)
  const cap = Math.max(0, Math.min(MAX_NEW_PER_DAY, newPerDay) - newIntroducedToday)
  const fresh = words.filter(isNewWord).slice(0, cap)
  return [...due, ...fresh]
}

export function pickDirection(mode, index) {
  if (mode === 'de-ru' || mode === 'ru-de') return mode
  return index % 2 === 0 ? 'de-ru' : 'ru-de'
}

// ---------- import ----------

const ARTICLE_RE = /^(der|die|das)\s+(.+)$/i

export function makeWord({ de, ru, example_de = '', plural = '', tags = [], id }) {
  let article = null
  let lemma = String(de).trim()
  const m = lemma.match(ARTICLE_RE)
  if (m) {
    article = m[1].toLowerCase()
    lemma = m[2].trim()
  }
  return {
    id: id || `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    de: lemma,
    ru: String(ru).trim(),
    article,
    plural: String(plural || '').trim(),
    example_de: String(example_de || '').trim(),
    tags,
    createdAt: Date.now(),
    ...newSrsFields(),
    reviewed_at: null,
    wrong_count: 0
  }
}

function wordKey(w) {
  return normalizeAnswer(`${w.article || ''} ${w.de}`)
}

// Paste format, one word per line: "de;ru;пример[;plural[;tag1,tag2]]".
// Tab-separated (copied from a spreadsheet) works too. Lines without both a
// German and a Russian part are reported as invalid, duplicates (same
// article+lemma already in the list or earlier in the paste) are skipped.
export function parseImport(text, existingWords = [], lookupNoun = null) {
  const seen = new Set(existingWords.map(wordKey))
  const words = []
  let skipped = 0
  const invalid = []
  let enriched = 0

  const lines = String(text || '').split(/\r?\n/)
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const sep = line.includes(';') ? ';' : line.includes('\t') ? '\t' : null
    const parts = sep ? line.split(sep).map((p) => p.trim()) : []
    const [de, ru, example_de, plural, tagsRaw] = parts
    if (i === 0 && /^de$/i.test(de || '')) return // header row
    if (!de || !ru) {
      invalid.push(i + 1)
      return
    }
    const tags = tagsRaw ? tagsRaw.split(/[,\s]+/).filter(Boolean) : []
    const word = makeWord({ de, ru, example_de, plural, tags })
    // Bare capitalised word, or a noun without plural: fill from the static
    // noun list (never overrides what the user typed).
    const found = lookupNoun && lookupNoun(word.de)
    let filled = false
    if (found) {
      if (!word.article && found.article) {
        word.article = found.article
        filled = true
      }
      if (!word.plural && found.plural && word.article === found.article) {
        word.plural = found.plural
        filled = true
      }
    }
    const key = wordKey(word)
    if (seen.has(key)) {
      skipped++
      return
    }
    seen.add(key)
    if (filled) enriched++
    words.push(word)
  })
  return { words, skipped, invalid, enriched }
}

// ---------- stats ----------

// Buckets by current interval: new / young (<7 d) / mid (7-20 d) / mature (21+ d).
export function wordStats(words, todayKey) {
  const buckets = { new: 0, young: 0, mid: 0, mature: 0 }
  let due = 0
  for (const w of words) {
    if (isNewWord(w)) {
      buckets.new++
      continue
    }
    const d = intervalDays(w)
    if (d >= LEARNED_FROM_INTERVAL) buckets.mature++
    else if (d >= 7) buckets.mid++
    else buckets.young++
    if (isDue(w, todayKey)) due++
  }
  const topMistakes = words
    .filter((w) => w.wrong_count > 0)
    .sort((a, b) => b.wrong_count - a.wrong_count)
    .slice(0, 10)
  return { total: words.length, learned: buckets.mature, due, fresh: buckets.new, buckets, topMistakes }
}

// ---------- control tests ----------

export const CONTROL_TEST_INTERVAL_DAYS = 28

export function checkTotals(check) {
  const score = check.parts.reduce((s, p) => s + (Number(p.score) || 0), 0)
  const max = check.parts.reduce((s, p) => s + (Number(p.max) || 0), 0)
  return { score, max, pct: max ? Math.round((score / max) * 100) : 0 }
}

export function nextControlTestDate(checks) {
  if (!checks.length) return null
  const last = checks.map((c) => c.date).sort().at(-1)
  return addDaysKey(last, CONTROL_TEST_INTERVAL_DAYS)
}

// ---------- progress zones / activity ----------

// A day is "active" if any XP was earned OR it was explicitly marked done;
// the streak counts either. Reminders only react to the explicit "done".
export function activeDays(german) {
  return [...new Set([...(german.doneDates || []), ...(german.activeDates || [])])]
}

// Active yesterday but not yet today → streak is alive but at risk.
export function isStreakAtRisk(german, todayKey) {
  const days = new Set(activeDays(german))
  return !days.has(todayKey) && days.has(addDaysKey(todayKey, -1))
}

// XP per zone over the last 7 days (today included).
export function zoneWeek(history, todayKey) {
  const from = addDaysKey(todayKey, -6)
  const sum = { vocab: 0, grammar: 0, writing: 0 }
  for (const h of history || []) {
    if (h.date >= from && h.date <= todayKey && h.zone in sum) sum[h.zone] += h.xp
  }
  return sum
}

// Error categories from the writing log + drills/AI (german.weak), top N.
export function weakSpots(german, n = 3) {
  const sum = { ...(german.weak || {}) }
  for (const w of german.writings || []) {
    for (const [k, c] of Object.entries(w.errors || {})) sum[k] = (sum[k] || 0) + c
  }
  return Object.entries(sum)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([category, count]) => ({ category, count }))
}

// ---------- Lückentext drills ----------

// Starter checklist topics (ids g-0..g-8, see store/german.js) → the block
// name of their static exercises in data/german/lueckentext.json.
export const DRILL_BLOCK_BY_TOPIC = {
  'g-0': 'Adjektivdeklination',
  'g-1': 'Präpositionen + Kasus',
  'g-2': 'Verben mit Präpositionen',
  'g-3': 'Konnektoren',
  'g-4': 'Relativsätze',
  'g-5': 'Passiv',
  'g-6': 'Konjunktiv II',
  'g-7': 'n-Deklination',
  'g-8': 'Nomen-Verb-Verbindungen'
}

// A miss in a drill block feeds the shared weak-spot categories.
export const DRILL_WEAK_CATEGORY = {
  Adjektivdeklination: 'adjektivendung',
  'Präpositionen + Kasus': 'praeposition',
  'Verben mit Präpositionen': 'praeposition',
  Konnektoren: 'nebensatz',
  Relativsätze: 'nebensatz',
  Passiv: 'passiv',
  'Konjunktiv II': 'konjunktiv',
  'n-Deklination': 'ndeklination',
  'Nomen-Verb-Verbindungen': 'wortschatz'
}
