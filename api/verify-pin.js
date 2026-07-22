// Проверка общего PIN-кода и выдача токена доступа к остальным эндпоинтам.
// Токен — HMAC от срока действия, подписанный APP_PIN как секретом:
// без знания PIN его не подделать, и не нужна база данных для хранения сессий.

import crypto from 'node:crypto'
import { issueToken } from './_lib/auth.js'

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

  return res.status(200).json(issueToken(appPin))
}
