// Cheap client-side gate so a normal "add a task" message never takes the
// extra round trip: only texts that look like a bulk-move instruction go to
// /api/ai-reschedule at all. A false negative just falls back to the regular
// create-task flow (harmless); a false positive costs one extra AI call that
// returns an empty moves array (also harmless).
const RESCHEDULE_PATTERN =
  /перенес|перенос|сдвин|передвинь|верни|verschieb|verleg|reschedul|move (all|everything|it)|postpone/i

export function isRescheduleCommand(text) {
  return RESCHEDULE_PATTERN.test(text)
}
