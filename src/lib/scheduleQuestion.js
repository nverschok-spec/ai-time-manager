// Cheap client-side gate, same spirit as rescheduleIntent.js — only texts
// that look like a question about the schedule go to /api/ai-ask at all.
// Checked AFTER isRescheduleCommand (that one is more specific) and BEFORE
// falling back to the default create-task flow.
const QUESTION_PATTERN =
  /\?\s*$|^(что|когда|сколько|есть ли|свободен|свободна|what|when|how (many|much)|am i free|do i have|was|wann|wie viel|bin ich frei|habe ich)\b/i

export function isScheduleQuestion(text) {
  return QUESTION_PATTERN.test(text.trim())
}
