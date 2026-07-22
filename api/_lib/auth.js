// Shared PIN-token helpers for serverless functions. Filename prefixed with
// "_" so Vercel doesn't treat this as a route.
import crypto from 'node:crypto'

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function signToken(expiresAt, secret) {
  return crypto.createHmac('sha256', secret).update(String(expiresAt)).digest('hex')
}

export function issueToken(secret) {
  const expiresAt = Date.now() + TOKEN_TTL_MS
  return { token: `${expiresAt}.${signToken(expiresAt, secret)}`, expiresAt }
}

export function isValidToken(token, secret) {
  if (typeof token !== 'string') return false
  const [expiresAtStr, signature] = token.split('.')
  const expiresAt = Number(expiresAtStr)
  if (!expiresAt || !signature || expiresAt < Date.now()) return false

  const expectedSig = signToken(expiresAtStr, secret)
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSig)
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}

export function requireAuth(req, res, appPin) {
  if (!appPin) return true
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!isValidToken(token, appPin)) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
