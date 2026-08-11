// Some person records predate the color field (or synced from an older
// client) and can have color === undefined/null — must not crash the whole
// render tree over a missing swatch, so every path below falls back to this.
const FALLBACK_HEX = '#2ECC91'

function normalizeHex(hex) {
  return /^#?[0-9a-fA-F]{6}$/.test(hex || '') ? hex : FALLBACK_HEX
}

// "#2ECC91" -> "46 204 145", the space-separated channel form Tailwind's
// rgb(var(--x) / <alpha-value>) pattern needs to keep opacity modifiers
// (bg-brand-cta/40 etc) working with a runtime-changeable color.
export function hexToRgbChannels(hex) {
  const clean = normalizeHex(hex).replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

// WCAG relative luminance -> pick black or white text, whichever reads on
// this accent. Needed because PEOPLE_COLORS spans light swatches (amber,
// mint) and dark ones (violet) — a hardcoded white foreground fails contrast
// on the light end.
export function readableForegroundChannels(hex) {
  const clean = normalizeHex(hex).replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return luminance > 0.55 ? '8 11 15' : '255 255 255'
}
