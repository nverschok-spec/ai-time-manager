// Public (unauthenticated-header) endpoint — Calendar apps can't send a
// Bearer token, so identity/authorization here is entirely the unguessable
// `token` query param (see api/people.js, which mints it) matched against
// what's stored in Redis for that person. Read-only, GET only.

import { Redis } from '@upstash/redis'
import { buildIcs } from '../src/lib/ics.js'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { person, token } = req.query || {}
  if (!person || !token) {
    return res.status(400).json({ error: 'Missing person or token' })
  }

  const expectedToken = await redis.get(`feedToken:${person}`)
  if (!expectedToken || expectedToken !== token) {
    return res.status(403).json({ error: 'Invalid token' })
  }

  const tasks = (await redis.get(`tasks:${person}`)) || []
  const ics = buildIcs(tasks)

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(ics)
}
