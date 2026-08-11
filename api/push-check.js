import { Redis } from '@upstash/redis'
import webpush from 'web-push'
import { timingSafeStringEqual } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

// Polled every few minutes by an external scheduler (Vercel Hobby cron only
// runs once/day, too coarse for time-accurate reminders) — see README.
export default async function handler(req, res) {
  if (!timingSafeStringEqual(req.query.secret, process.env.PUSH_CHECK_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const now = Date.now()
  const keys = await redis.keys('reminder:*')
  let sent = 0

  for (const key of keys) {
    const reminder = await redis.get(key)
    if (!reminder || reminder.sendAt > now) continue

    const subscription = await redis.get(`sub:${reminder.personId}`)
    if (subscription) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({ title: reminder.title, body: 'AI Time Manager', url: '/' })
        )
        sent++
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await redis.del(`sub:${reminder.personId}`)
        }
      }
    }
    await redis.del(key)
  }

  return res.status(200).json({ ok: true, sent, checked: keys.length })
}
