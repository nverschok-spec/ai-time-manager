import { Redis } from '@upstash/redis'

const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })

export default async function handler(req, res) {
  const { deviceId } = req.body || {}
  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' })

  if (req.method === 'POST') {
    const { subscription } = req.body
    if (!subscription) return res.status(400).json({ error: 'Missing subscription' })
    await redis.set(`sub:${deviceId}`, subscription)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    await redis.del(`sub:${deviceId}`)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
