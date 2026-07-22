// Vercel Serverless Function — единственное место, где используется API-ключ.
//
// КРИТИЧНО ПО ПРИВАТНОСТИ (см. ТЗ, раздел 5):
// - НЕ логировать тело запроса (console.log(text) и т.п.) в проде
// - НЕ сохранять историю обращений в файл/БД
// - ключ читается только из process.env, никогда не возвращается клиенту

import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_lib/auth.js'

const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          start_time: { type: 'string', description: 'HH:MM, 24-hour' },
          duration_minutes: { type: 'integer' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          confidence: { type: 'number', description: '0.0 to 1.0' }
        },
        required: ['title', 'date', 'start_time', 'duration_minutes', 'priority', 'confidence'],
        additionalProperties: false
      }
    }
  },
  required: ['suggestions'],
  additionalProperties: false
}

function buildSystemPrompt(today) {
  return `You parse a user's natural-language scheduling request into structured task suggestions.
Today's date is ${today} (YYYY-MM-DD). The user may write in Russian, German, or English.
You will also receive a compact list of already-scheduled slots (the user's busy times, ±7 days).
Do not worry about detecting conflicts yourself — that is handled separately downstream.
The user may attach a photo instead of (or in addition to) typing — an invitation, an
appointment card, a screenshot, a document with a date/time on it. Read any relevant text
in the image and extract the same fields from it as you would from typed text. If the image
contains no date/time/scheduling information at all, return an empty suggestions array.
For each distinct task/appointment/reminder implied by the user's text or photo, produce one suggestion with:
- title: short, in the same language the user wrote in
- date: resolved absolute date in YYYY-MM-DD, based on today's date and relative terms like "tomorrow"/"Thursday"
- start_time: HH:MM 24-hour. If the user gave no explicit time for a "find me time for X" style request, pick a reasonable free slot outside the provided busy times AND outside the times of the other suggestions you are generating in this same response — never let two of your own suggestions overlap each other.
- duration_minutes: your best estimate if not stated explicitly
- priority: "low" | "medium" | "high"
- confidence: 0.0-1.0, how confident you are in this interpretation. Use a lower value when the request is ambiguous (missing date, vague duration, unclear intent).
If the text contains no actionable scheduling request, return an empty suggestions array.`
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

  const { text, scheduleContext, today, image } = req.body || {}
  if (!text && !image?.base64) {
    return res.status(400).json({ error: 'Missing "text" or "image" in request body' })
  }

  const resolvedToday = today || new Date().toISOString().slice(0, 10)
  const client = new Anthropic({ apiKey })

  const userContent = []
  if (image?.base64 && image?.mediaType) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.base64 }
    })
  }
  userContent.push({
    type: 'text',
    text: `User request: ${text || '(see attached photo)'}\n\nExisting busy slots (JSON): ${JSON.stringify(scheduleContext || [])}`
  })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: buildSystemPrompt(resolvedToday),
      output_config: {
        format: { type: 'json_schema', schema: SUGGESTION_SCHEMA }
      },
      messages: [{ role: 'user', content: userContent }]
    })

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ suggestions: [] })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    const parsed = textBlock ? JSON.parse(textBlock.text) : { suggestions: [] }

    return res.status(200).json({ suggestions: parsed.suggestions || [] })
  } catch (err) {
    return res.status(502).json({ error: 'AI parsing failed' })
  }
}
