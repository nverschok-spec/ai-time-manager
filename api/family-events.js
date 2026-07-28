// Общий список семейных событий — по образцу shopping.js: один ключ на всю
// семью, без разделения по personId. Единственная сущность, помимо списка
// покупок, которую семья решила делать общей; личные tasks остаются приватными.

import { Redis } from '@upstash/redis'
import { requirePersonAuth } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

const KEY = 'familyEvents:household'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default async function handler(req, res) {
  const appPin = process.env.APP_PIN
  const personId = requirePersonAuth(req, res, appPin)
  if (!personId) return

  if (req.method === 'GET') {
    const events = (await redis.get(KEY)) || []
    return res.status(200).json({ events })
  }

  if (req.method === 'POST') {
    const { event } = req.body || {}
    if (!event || !event.title || !event.date) return res.status(400).json({ error: 'Missing event' })
    const events = (await redis.get(KEY)) || []
    const newEvent = { ...event, id: event.id || makeId() }
    const exists = events.some((e) => e.id === newEvent.id)
    const updated = exists ? events.map((e) => (e.id === newEvent.id ? newEvent : e)) : [...events, newEvent]
    await redis.set(KEY, updated)
    return res.status(200).json({ event: newEvent })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const events = (await redis.get(KEY)) || []
    await redis.set(KEY, events.filter((e) => e.id !== id))
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
