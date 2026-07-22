// Vercel Serverless Function — короткая ИИ-сводка дня для утреннего обзора.
// Тот же ключ и авторизация, что и /api/ai-parse; не логировать тело запроса.

import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_lib/auth.js'

function buildSystemPrompt() {
  return `You write a very short daily briefing for a personal scheduling app.
The user may write/read in Russian, German, or English — always reply in the language given as "locale" (ru, de, or en).
You will receive today's task list as JSON (title, start_time, duration_minutes, priority).
Write 1-2 short sentences: mention how busy the day looks, call out back-to-back or tightly packed times if any, and nudge toward the highest-priority item if one stands out. Be warm and concise, no bullet points, no greeting, no markdown.
If the task list is empty, write one short encouraging sentence about a free day.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' })
  }

  if (!requireAuth(req, res, process.env.APP_PIN)) return

  const { tasks, locale } = req.body || {}
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Missing "tasks" array in request body' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: `locale: ${locale || 'en'}\n\nTasks (JSON): ${JSON.stringify(tasks)}`
        }
      ]
    })

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ digest: '' })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    return res.status(200).json({ digest: textBlock?.text?.trim() || '' })
  } catch (err) {
    return res.status(502).json({ error: 'AI digest failed' })
  }
}
