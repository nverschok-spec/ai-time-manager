// Vercel Serverless Function — short AI reflection on the past 7 days, for
// the weekly review card. Same auth/key as /api/ai-digest and /api/ai-parse.

import Anthropic from '@anthropic-ai/sdk'
import { requirePersonAuth } from './_lib/auth.js'

function buildSystemPrompt() {
  return `You write a very short weekly reflection for a personal scheduling app.
The user may write/read in Russian, German, or English — always reply in the language given as "locale" (ru, de, or en).
You will receive stats for the last 7 days as JSON: total tasks, how many were completed, a breakdown by category, and a breakdown by priority.
Write 2-3 short sentences: acknowledge the completion rate (be encouraging even if it's low), note one interesting pattern if there is one (e.g. a category that got neglected, or a lot of high-priority items), and end with one gentle, concrete nudge for the coming week. Warm, concise, no bullet points, no greeting, no markdown.
If total is 0, write one short encouraging sentence about a quiet week.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  if (!requirePersonAuth(req, res, process.env.APP_PIN)) return

  const { stats, locale } = req.body || {}
  if (!stats || typeof stats.total !== 'number') {
    return res.status(400).json({ error: 'Missing "stats" in request body' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 220,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: `locale: ${locale || 'en'}\n\nStats (JSON): ${JSON.stringify(stats)}`
        }
      ]
    })

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ review: '' })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    return res.status(200).json({ review: textBlock?.text?.trim() || '' })
  } catch (err) {
    return res.status(502).json({ error: 'AI weekly review failed' })
  }
}
