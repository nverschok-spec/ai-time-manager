function makeQuestionId() {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const REJECT_REASON = {
  question: 'нет текста вопроса',
  block: 'не указан блок',
  options: 'не 4 варианта ответа',
  correct: 'индекс верного ответа вне диапазона 0–3',
  explanation: 'нет объяснения'
}

// Schema check before anything (AI output or an imported file) gets saved
// into a bank — a malformed question (wrong option count, out-of-range
// correct index) would otherwise silently break QuestionRunner later.
// Verbose variant reports WHY each rejected item was dropped, for the
// import-bank UI's "Импортировано N, отброшено M" summary; the plain
// validateQuestions below just needs the survivors.
export function validateQuestionsVerbose(raw) {
  const valid = []
  const reasons = []
  for (const q of Array.isArray(raw) ? raw : []) {
    if (!q || typeof q !== 'object') {
      reasons.push('пустая запись')
      continue
    }
    if (typeof q.question !== 'string' || !q.question.trim()) {
      reasons.push(REJECT_REASON.question)
      continue
    }
    if (typeof q.block !== 'string' || !q.block.trim()) {
      reasons.push(REJECT_REASON.block)
      continue
    }
    if (!Array.isArray(q.options) || q.options.length !== 4 || !q.options.every((o) => typeof o === 'string' && o.trim())) {
      reasons.push(REJECT_REASON.options)
      continue
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
      reasons.push(REJECT_REASON.correct)
      continue
    }
    if (typeof q.explanation !== 'string') {
      reasons.push(REJECT_REASON.explanation)
      continue
    }
    valid.push({
      id: makeQuestionId(),
      block: q.block.trim(),
      question: q.question.trim(),
      options: q.options,
      correct: q.correct,
      explanation: q.explanation.trim(),
      ...(typeof q.readingText === 'string' && q.readingText.trim() ? { readingText: q.readingText.trim() } : {})
    })
  }
  return { valid, rejectedCount: reasons.length, rejectedReasons: [...new Set(reasons)] }
}

export function validateQuestions(raw) {
  return validateQuestionsVerbose(raw).valid
}

// Maps the external trainer's compact field names onto our internal shape
// (t→block, q→question, o→options, a→correct, e→explanation, r→readingText
// for S-05 later; h is dropped — it's just an optional subtitle the source
// format uses, nothing here reads it yet). Goes through the same
// validateQuestionsVerbose check as everything else afterward.
export function mapExternalBankItem(item) {
  if (!item || typeof item !== 'object') return null
  return {
    block: item.t,
    question: item.q,
    options: item.o,
    correct: item.a,
    explanation: item.e,
    readingText: item.r
  }
}

// For "add to an existing bank, no duplicates" — a question counts as a
// duplicate of one already in the bank if its text AND its 4 options match
// exactly (so two different questions that happen to share a prompt but
// have different options still both get kept).
export function dedupeAgainstBank(newQuestions, existingBank) {
  if (!existingBank) return newQuestions
  const existingKeys = new Set(existingBank.questions.map((q) => `${q.question.trim()}|${q.options.join('|')}`))
  return newQuestions.filter((q) => !existingKeys.has(`${q.question.trim()}|${q.options.join('|')}`))
}

// Inverse of mapExternalBankItem — lets a bank round-trip back out to the
// same compact format for sharing/backup outside the app.
export function exportBankToExternalFormat(bank) {
  return JSON.stringify(
    {
      title: bank.topic,
      items: bank.questions.map((q) => ({
        t: q.block,
        q: q.question,
        o: q.options,
        a: q.correct,
        e: q.explanation,
        ...(q.readingText ? { r: q.readingText } : {})
      }))
    },
    null,
    2
  )
}

// Explanations may contain <b> for emphasis (from imports or future AI
// output) — this is the ONLY tag allowed through. Everything is HTML-escaped
// first, then exactly the <b>/</b> sequences are unescaped back to real
// tags, so anything else (e.g. <script>, <img onerror=...>) stays inert
// literal text instead of becoming markup. Safe to feed straight into
// dangerouslySetInnerHTML.
export function sanitizeExplanationHtml(raw) {
  if (typeof raw !== 'string') return ''
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/&lt;b&gt;/gi, '<b>').replace(/&lt;\/b&gt;/gi, '</b>')
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
