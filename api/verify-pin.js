// Шаг 1 входа: проверка общего PIN-кода семьи -> короткоживущий preToken +
// список уже зарегистрированных людей, чтобы клиент показал экран "кто ты".

import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'
import { issuePreToken } from './_lib/auth.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

// A 6-digit PIN is only ~1M combinations — with no throttle, an automated
// script could work through that space. Coarse per-IP counter (Vercel sets
// x-forwarded-for reliably) makes brute-forcing the whole space take years
// from a single source, while staying generous enough that a real person
// fumbling the PIN a few times never notices it.
const MAX_ATTEMPTS = 8
const WINDOW_SECONDS = 15 * 60

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

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

  const attemptsKey = `pinAttempts:${clientIp(req)}`
  const attempts = await redis.incr(attemptsKey)
  if (attempts === 1) await redis.expire(attemptsKey, WINDOW_SECONDS)
  if (attempts > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts, try again later' })
  }

  const provided = Buffer.from(pin)
  const expected = Buffer.from(appPin)
  const isMatch =
    provided.length === expected.length && crypto.timingSafeEqual(provided, expected)

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid PIN' })
  }

  await redis.del(attemptsKey)

  const people = (await redis.get('people')) || []
  const { preToken, expiresAt } = issuePreToken(appPin)

  return res.status(200).json({ preToken, expiresAt, people })
}
