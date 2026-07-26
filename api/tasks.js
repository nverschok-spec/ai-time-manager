// Личные задачи человека — ключ в Redis привязан к personId из токена,
// никогда не берётся из тела запроса, поэтому увидеть чужие задачи нельзя.

import { Redis } from '@upstash/redis'
import { requirePersonAuth } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default async function handler(req, res) {
  const appPin = process.env.APP_PIN
  const personId = requirePersonAuth(req, res, appPin)
  if (!personId) return

  const key = `tasks:${personId}`

  if (req.method === 'GET') {
    const tasks = (await redis.get(key)) || []
    return res.status(200).json({ tasks })
  }

  if (req.method === 'POST') {
    const { task } = req.body || {}
    if (!task || !task.title) return res.status(400).json({ error: 'Missing task' })
    const tasks = (await redis.get(key)) || []
    // Preserve an incoming id (undo-restore / import) instead of minting a
    // new one; upsert if that id already exists so retries stay idempotent.
    const newTask = { done: false, ...task, id: task.id || makeId() }
    const exists = tasks.some((t) => t.id === newTask.id)
    const updated = exists ? tasks.map((t) => (t.id === newTask.id ? newTask : t)) : [...tasks, newTask]
    await redis.set(key, updated)
    return res.status(200).json({ task: newTask })
  }

  if (req.method === 'PUT') {
    const { id, patch } = req.body || {}
    if (!id || !patch) return res.status(400).json({ error: 'Missing id or patch' })
    const tasks = (await redis.get(key)) || []
    await redis.set(key, tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {}
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const tasks = (await redis.get(key)) || []
    await redis.set(key, tasks.filter((t) => t.id !== id))
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
