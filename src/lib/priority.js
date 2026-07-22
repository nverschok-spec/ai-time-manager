import { AlertTriangle, Flag, Minus } from 'lucide-react'

// Validated status colors (dataviz skill: icon+label always pairs with the
// color so identity never rests on hue alone). "low" intentionally has no
// status color — it's the muted/no-particular-urgency state.
export const PRIORITY_META = {
  high: { color: '#FF6B6B', icon: AlertTriangle, labelKey: 'priority.high' },
  medium: { color: '#F4B740', icon: Flag, labelKey: 'priority.medium' },
  low: { color: '#8B93A7', icon: Minus, labelKey: 'priority.low' }
}

export const PRIORITY_ORDER = ['high', 'medium', 'low']

export function priorityMeta(priority) {
  return PRIORITY_META[priority] || PRIORITY_META.low
}
