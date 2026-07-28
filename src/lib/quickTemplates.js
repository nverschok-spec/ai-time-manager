// One-tap starting points for common errands — still opens the form (not an
// instant silent create) so date/time/etc can be checked before saving.
export const QUICK_TEMPLATES = [
  { key: 'pharmacy', category: 'health', durationMinutes: 15, priority: 'medium' },
  { key: 'groceries', category: 'home', durationMinutes: 30, priority: 'medium' },
  { key: 'workout', category: 'health', durationMinutes: 45, priority: 'medium' },
  { key: 'cleaning', category: 'home', durationMinutes: 60, priority: 'low' }
]
