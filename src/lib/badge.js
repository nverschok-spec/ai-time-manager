// Badging API — iOS Safari supports it for home-screen-installed PWAs.
// Best-effort only: unsupported browsers/contexts just no-op.
export function updateAppBadge(count) {
  if (!('setAppBadge' in navigator)) return
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {})
  } else {
    navigator.clearAppBadge().catch(() => {})
  }
}
