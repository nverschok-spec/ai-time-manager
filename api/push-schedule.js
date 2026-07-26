import { Redis } from '@upstash/redis'
import { requirePersonAuth } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

// Reminders live for 7 days max (matches the schedule context window elsewhere
// in the app) so a stale, never-fired key can't linger in Redis forever.
const REMINDER_TTL_SECONDS = 7 * 24 * 60 * 60

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const appPin = process.env.APP_PIN
  const personId = requirePersonAuth(req, res, appPin)
  if (!personId) return

  const { taskId, title, sendAt } = req.body || {}
  if (!taskId || !title || !sendAt) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  if (typeof sendAt !== 'number' || sendAt <= Date.now()) {
    return res.status(200).json({ ok: true, skipped: 'past_or_invalid' })
  }

  await redis.set(`reminder:${personId}:${taskId}`, { personId, taskId, title, sendAt }, {
    ex: REMINDER_TTL_SECONDS
  })

  return res.status(200).json({ ok: true })
}
