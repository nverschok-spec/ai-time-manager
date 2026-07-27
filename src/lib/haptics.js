// navigator.vibrate is Android/desktop-Chrome only — iOS Safari has no API for
// it at all, so every call here is naturally a silent no-op on iPhone rather
// than something we need to feature-detect per call site.
export function vibrate(pattern) {
  navigator.vibrate?.(pattern)
}

export const HAPTIC = {
  tap: 10,
  success: [10, 40, 20],
  delete: 15
}
