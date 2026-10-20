function makeQuestionId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Schema check before anything from the AI gets saved into a bank — a
// malformed question (wrong option count, out-of-range correct index) would
// otherwise silently break QuestionRunner later.
export function validateQuestions(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (q) =>
        q &&
        typeof q.question === 'string' &&
        q.question.trim() &&
        typeof q.block === 'string' &&
        q.block.trim() &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((o) => typeof o === 'string' && o.trim()) &&
        Number.isInteger(q.correct) &&
        q.correct >= 0 &&
        q.correct <= 3 &&
        typeof q.explanation === 'string'
    )
    .map((q) => ({
      id: makeQuestionId(),
      block: q.block.trim(),
      question: q.question.trim(),
      options: q.options,
      correct: q.correct,
      explanation: q.explanation.trim()
    }))
}

// Fisher-Yates — reshuffled per attempt so the same bank doesn't always
// present questions in the same order.
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function mistakeQuestions(bank, mistakes) {
  if (!bank) return []
  return bank.questions.filter((q) => mistakes[q.id] != null)
}

// Weakest block first, from the raw per-answer log rather than per-attempt
// summaries — training/mistakes-mode answers (which never produce an
// "attempt") count toward it too.
export function blockStats(answerLog, topicSlug) {
  const byBlock = {}
  for (const a of answerLog) {
    if (a.topicSlug !== topicSlug) continue
    byBlock[a.block] = byBlock[a.block] || { correct: 0, total: 0 }
    byBlock[a.block].total++
    if (a.correct) byBlock[a.block].correct++
  }
  return Object.entries(byBlock)
    .map(([block, s]) => ({ block, ...s, pct: s.total ? Math.round((s.correct / s.total) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct)
}
