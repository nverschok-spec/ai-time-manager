// Two-step PIN-token system for serverless functions. Filename prefixed with
// "_" so Vercel doesn't treat this as a route.
//
// Step 1 (verify-pin): shared household PIN -> short-lived "pre" token that
// only proves PIN knowledge, not identity.
// Step 2 (select-person): "pre" token + chosen/new person -> long-lived
// "full" token bound to that person's id. All data endpoints require a
// "full" token and derive personId from it — never from the request body —
// so one household member can't act as another just by editing a payload.
import crypto from 'node:crypto'

const PRE_TTL_MS = 10 * 60 * 1000 // 10 minutes to pick/create a person
const FULL_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export function issuePreToken(secret) {
  const expiresAt = Date.now() + PRE_TTL_MS
  const payload = `pre.${expiresAt}`
  return { preToken: `${payload}.${sign(payload, secret)}`, expiresAt }
}

export function issuePersonToken(secret, personId) {
  const expiresAt = Date.now() + FULL_TTL_MS
  const payload = `full.${personId}.${expiresAt}`
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt }
}

function verify(token, secret) {
  if (typeof token !== 'string') return null
  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return null
  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)

  const expectedBuf = Buffer.from(sign(payload, secret))
  const sigBuf = Buffer.from(sig)
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

  const parts = payload.split('.')
  if (parts[0] === 'pre' && parts.length === 2) {
    const expiresAt = Number(parts[1])
    if (!expiresAt || expiresAt < Date.now()) return null
    return { type: 'pre', expiresAt }
  }
  if (parts[0] === 'full' && parts.length === 3) {
    const [, personId, expiresAtStr] = parts
    const expiresAt = Number(expiresAtStr)
    if (!personId || !expiresAt || expiresAt < Date.now()) return null
    return { type: 'full', personId, expiresAt }
  }
  return null
}

// Shared by any endpoint comparing a caller-supplied secret against a known
// value (query-param tokens, cron secrets) — plain `!==` leaks a timing
// signal proportional to how many leading bytes match.
export function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf)
}

function bearerToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

// Returns the authenticated personId, or null (and already sent the 401/500
// response) on failure — callers should `if (!personId) return`.
export function requirePersonAuth(req, res, appPin) {
  if (!appPin) {
    res.status(500).json({ error: 'APP_PIN is not configured' })
    return null
  }
  const decoded = verify(bearerToken(req), appPin)
  if (!decoded || decoded.type !== 'full') {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return decoded.personId
}

// Returns true/false; false means the 401/500 response was already sent.
export function requirePreAuth(req, res, appPin) {
  if (!appPin) {
    res.status(500).json({ error: 'APP_PIN is not configured' })
    return false
  }
  const decoded = verify(bearerToken(req), appPin)
  if (!decoded || decoded.type !== 'pre') {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}
