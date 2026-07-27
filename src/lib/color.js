// "#2ECC91" -> "46 204 145", the space-separated channel form Tailwind's
// rgb(var(--x) / <alpha-value>) pattern needs to keep opacity modifiers
// (bg-brand-cta/40 etc) working with a runtime-changeable color.
export function hexToRgbChannels(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}
