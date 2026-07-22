// Fixed palette so colors stay visually distinct and consistent — picking a
// swatch instead of a free color picker keeps the "add person" UI a one-tap action.
export const PEOPLE_COLORS = [
  '#3DDC97', // brand mint
  '#00C2A8', // brand teal
  '#F4B740', // priority.medium
  '#FF6B6B', // priority.high
  '#8B93A7', // priority.low
  '#60A5FA', // sky
  '#C084FC', // violet
  '#F472B6' // pink
]

export function nextAvailableColor(existingPeople) {
  const used = new Set(existingPeople.map((p) => p.color))
  return PEOPLE_COLORS.find((c) => !used.has(c)) || PEOPLE_COLORS[existingPeople.length % PEOPLE_COLORS.length]
}
