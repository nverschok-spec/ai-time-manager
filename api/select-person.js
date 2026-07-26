// Шаг 2 входа: preToken + выбор существующего человека ИЛИ имя нового ->
// person-bound токен на 30 дней. Создание нового человека тоже происходит
// здесь же (единая точка регистрации семьи).

import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'
import { requirePreAuth, issuePersonToken } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

const COLORS = ['#3DDC97', '#00C2A8', '#F4B740', '#FF6B6B', '#8B93A7', '#60A5FA', '#C084FC', '#F472B6']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const appPin = process.env.APP_PIN
  if (!requirePreAuth(req, res, appPin)) return

  const { personId, name } = req.body || {}
  const people = (await redis.get('people')) || []

  let person
  if (personId) {
    person = people.find((p) => p.id === personId)
    if (!person) return res.status(404).json({ error: 'Person not found' })
  } else {
    const trimmed = (name || '').trim()
    if (!trimmed) return res.status(400).json({ error: 'Missing "name" or "personId"' })

    const usedColors = new Set(people.map((p) => p.color))
    const color = COLORS.find((c) => !usedColors.has(c)) || COLORS[people.length % COLORS.length]
    person = { id: crypto.randomUUID(), name: trimmed, color }
    await redis.set('people', [...people, person])
  }

  const { token, expiresAt } = issuePersonToken(appPin, person.id)
  return res.status(200).json({ token, expiresAt, person })
}
