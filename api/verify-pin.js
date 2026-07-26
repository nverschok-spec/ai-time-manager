// Шаг 1 входа: проверка общего PIN-кода семьи -> короткоживущий preToken +
// список уже зарегистрированных людей, чтобы клиент показал экран "кто ты".

import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'
import { issuePreToken } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const appPin = process.env.APP_PIN
  if (!appPin) {
    return res.status(500).json({ error: 'APP_PIN is not configured' })
  }

  const { pin } = req.body || {}
  if (typeof pin !== 'string' || pin.length === 0) {
    return res.status(400).json({ error: 'Missing "pin" in request body' })
  }

  const provided = Buffer.from(pin)
  const expected = Buffer.from(appPin)
  const isMatch =
    provided.length === expected.length && crypto.timingSafeEqual(provided, expected)

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid PIN' })
  }

  const people = (await redis.get('people')) || []
  const { preToken, expiresAt } = issuePreToken(appPin)

  return res.status(200).json({ preToken, expiresAt, people })
}
