// Vercel Serverless Function — read-only Q&A about the user's own schedule
// ("what do I have on Thursday?", "how free am I this week?"). Same
// auth/key/model as the other AI endpoints; never creates or modifies tasks.

import Anthropic from '@anthropic-ai/sdk'
import { requirePersonAuth } from './_lib/auth.js'

function buildSystemPrompt(today) {
  return `You answer questions about the user's own schedule in a personal planner app.
Today's date is ${today} (YYYY-MM-DD). The user may write in Russian, German, or English — always reply in the same language as the question.
You will receive a JSON list of their tasks (date, start_time, duration_minutes, title, priority, category) for the surrounding weeks.
Answer the question directly and concisely (1-3 sentences), based only on the provided data. Resolve relative dates ("Thursday", "next week") against today's date.
If the question asks about free time, reason about gaps between the listed tasks.
If you don't have enough data to answer, say so briefly instead of guessing. Never suggest creating, editing, or moving tasks — that is a different feature; just answer the question.`
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

  const { question, tasks, today } = req.body || {}
  if (!question) {
    return res.status(400).json({ error: 'Missing "question" in request body' })
  }
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Missing "tasks" array in request body' })
  }

  const resolvedToday = today || new Date().toISOString().slice(0, 10)
  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: buildSystemPrompt(resolvedToday),
      messages: [
        {
          role: 'user',
          content: `Question: ${question}\n\nTasks (JSON): ${JSON.stringify(tasks)}`
        }
      ]
    })

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ answer: '' })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    return res.status(200).json({ answer: textBlock?.text?.trim() || '' })
  } catch (err) {
    return res.status(502).json({ error: 'AI ask failed' })
  }
}
