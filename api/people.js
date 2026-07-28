import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'
import { requirePersonAuth } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

export default async function handler(req, res) {
  const appPin = process.env.APP_PIN
  const personId = requirePersonAuth(req, res, appPin)
  if (!personId) return

  if (req.method === 'GET') {
    const people = (await redis.get('people')) || []

    // Lazily minted, never rotated automatically — this is the unguessable
    // secret in the ICS subscription URL (api/ics-feed.js); Apple Calendar
    // can't send an Authorization header, so the URL itself has to prove identity.
    let feedToken = await redis.get(`feedToken:${personId}`)
    if (!feedToken) {
      feedToken = crypto.randomBytes(24).toString('hex')
      await redis.set(`feedToken:${personId}`, feedToken)
    }

    return res.status(200).json({ people, feedToken })
  }

  if (req.method === 'PUT') {
    // Only your own color — personId comes from the auth token, never the
    // body, so one household member can't repaint another's accent color.
    const { color } = req.body || {}
    if (!color) return res.status(400).json({ error: 'Missing color' })
    const people = (await redis.get('people')) || []
    const updated = people.map((p) => (p.id === personId ? { ...p, color } : p))
    await redis.set('people', updated)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const people = (await redis.get('people')) || []
    await redis.set('people', people.filter((p) => p.id !== id))
    await redis.del(`tasks:${id}`)
    await redis.del(`sub:${id}`)
    await redis.del(`feedToken:${id}`)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
