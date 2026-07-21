const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isIos() {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export async function subscribeToPush(deviceId) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission_denied')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  const res = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, subscription })
  })
  if (!res.ok) throw new Error('subscribe_failed')

  return subscription
}

export async function unsubscribeFromPush(deviceId) {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()

  await fetch('/api/push-subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId })
  })
}

// sendAt is computed client-side (browser's own timezone) so the server never
// has to reinterpret a local date/time string in its own (UTC) timezone.
export async function scheduleReminder({ deviceId, taskId, title, date, startTime }) {
  const sendAt = new Date(`${date}T${startTime}:00`).getTime()
  if (Number.isNaN(sendAt) || sendAt <= Date.now()) return

  try {
    await fetch('/api/push-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, taskId, title, sendAt })
    })
  } catch {
    // best-effort — a missed reminder schedule shouldn't block task creation
  }
}
