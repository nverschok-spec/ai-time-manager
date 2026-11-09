import { toDateKey } from './date'

// Everything in this file is plain logic — no network, no API. The word
// trainer, the day plan and the reminders must keep working with no
// ANTHROPIC_API_KEY at all.

export const LEITNER_INTERVALS = [1, 2, 4, 8, 16] // days, index = box - 1
export const MAX_NEW_PER_DAY = 20
export const LEARNED_FROM_BOX = 4 // "выучено" = box 4 or 5

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

// Error categories for the writing log.
export const ERROR_CATEGORIES = [
  'artikel',
  'kasus',
  'adjektivendung',
  'verb',
  'wortstellung',
  'praeposition',
  'nebensatz',
  'wortschatz',
  'rechtschreibung',
  'stil'
]

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

// ---------- Leitner ----------

export function isNewWord(word) {
  return !word.reviewed_at
}

export function isDue(word, todayKey) {
  return !isNewWord(word) && word.next_review <= todayKey
}

// Right → box+1 (max 5); wrong → back to box 1 and wrong_count+1.
// next_review = today + interval of the NEW box.
export function applyLeitner(word, correct, todayKey) {
  const box = correct ? Math.min(5, (word.box || 1) + 1) : 1
  return {
    ...word,
    box,
    next_review: addDaysKey(todayKey, LEITNER_INTERVALS[box - 1]),
    reviewed_at: todayKey,
    wrong_count: (word.wrong_count || 0) + (correct ? 0 : 1)
  }
}

// Day session: due words first (oldest due, then lowest box), then new
// words up to the daily cap minus what's already been introduced today.
export function buildSession(words, todayKey, newPerDay, newIntroducedToday = 0) {
  const due = words
    .filter((w) => isDue(w, todayKey))
    .sort((a, b) => a.next_review.localeCompare(b.next_review) || a.box - b.box)
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
    box: 1,
    next_review: null,
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
export function parseImport(text, existingWords = []) {
  const seen = new Set(existingWords.map(wordKey))
  const words = []
  let skipped = 0
  const invalid = []

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
    const key = wordKey(word)
    if (seen.has(key)) {
      skipped++
      return
    }
    seen.add(key)
    words.push(word)
  })
  return { words, skipped, invalid }
}

// ---------- stats ----------

export function wordStats(words, todayKey) {
  const boxes = [0, 0, 0, 0, 0]
  let learned = 0
  let due = 0
  let fresh = 0
  for (const w of words) {
    if (isNewWord(w)) {
      fresh++
      continue
    }
    boxes[(w.box || 1) - 1]++
    if (w.box >= LEARNED_FROM_BOX) learned++
    if (w.next_review <= todayKey) due++
  }
  const topMistakes = words
    .filter((w) => w.wrong_count > 0)
    .sort((a, b) => b.wrong_count - a.wrong_count)
    .slice(0, 10)
  return { total: words.length, learned, due, fresh, boxes, topMistakes }
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
