// Общий список покупок на всю семью — один ключ, любой авторизованный
// человек может читать и писать (в отличие от tasks.js, тут нет разделения
// по personId — это единственная сущность, которую семья решила шарить).

import { Redis } from '@upstash/redis'
import { requirePersonAuth } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

const KEY = 'shopping:household'

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default async function handler(req, res) {
  const appPin = process.env.APP_PIN
  const personId = requirePersonAuth(req, res, appPin)
  if (!personId) return

  if (req.method === 'GET') {
    const items = (await redis.get(KEY)) || []
    return res.status(200).json({ items })
  }

  if (req.method === 'POST') {
    const { item } = req.body || {}
    if (!item || !item.text) return res.status(400).json({ error: 'Missing item' })
    const items = (await redis.get(KEY)) || []
    const newItem = { done: false, ...item, id: item.id || makeId() }
    const exists = items.some((i) => i.id === newItem.id)
    const updated = exists ? items.map((i) => (i.id === newItem.id ? newItem : i)) : [...items, newItem]
    await redis.set(KEY, updated)
    return res.status(200).json({ item: newItem })
  }

  if (req.method === 'PUT') {
    const { id, patch } = req.body || {}
    if (!id || !patch) return res.status(400).json({ error: 'Missing id or patch' })
    const items = (await redis.get(KEY)) || []
    await redis.set(KEY, items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const items = (await redis.get(KEY)) || []
    await redis.set(KEY, items.filter((i) => i.id !== id))
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
