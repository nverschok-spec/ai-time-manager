import { getStoredToken } from '../components/PinGate'
import { applyQuietHours } from './quietHours'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
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

export async function subscribeToPush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission_denied')

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  const res = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ subscription })
  })
  if (!res.ok) throw new Error('subscribe_failed')

  return subscription
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()

  await fetch('/api/push-subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() }
  })
}

// sendAt is computed client-side (browser's own timezone) so the server never
// has to reinterpret a local date/time string in its own (UTC) timezone —
// quietHours (also wall-clock, also the caller's job to supply) shifts it
// past the quiet window the same way, before the server ever sees it.
export async function scheduleReminder({ taskId, title, date, startTime, offsetMinutes = 0, quietHours }) {
  let sendAt = new Date(`${date}T${startTime}:00`).getTime() - offsetMinutes * 60000
  if (Number.isNaN(sendAt)) return
  if (quietHours) sendAt = applyQuietHours(sendAt, quietHours)
  if (sendAt <= Date.now()) return

  try {
    await fetch('/api/push-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ taskId, title, sendAt })
    })
  } catch {
    // best-effort — a missed reminder schedule shouldn't block task creation
  }
}
