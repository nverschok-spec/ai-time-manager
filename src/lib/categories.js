import { Briefcase, Heart, Home, Sparkles, Users } from 'lucide-react'

// Optional per-task category — deliberately separate from priority (urgency)
// and recurrence (schedule shape); a task can be "work" AND high-priority.
// Colors reuse the existing validated palette (priority/people swatches)
// rather than inventing new hues, so everything still reads as one system.
export const CATEGORY_META = {
  work: { color: '#60A5FA', icon: Briefcase, labelKey: 'category.work' },
  health: { color: '#3DDC97', icon: Heart, labelKey: 'category.health' },
  family: { color: '#F472B6', icon: Users, labelKey: 'category.family' },
  home: { color: '#F4B740', icon: Home, labelKey: 'category.home' },
  other: { color: '#8B93A7', icon: Sparkles, labelKey: 'category.other' }
}

export const CATEGORY_ORDER = ['work', 'health', 'family', 'home', 'other']

export function categoryMeta(category) {
  return category ? CATEGORY_META[category] : null
}
