// Vercel Serverless Function — bulk-reschedule an existing set of tasks from
// one natural-language instruction ("move everything today to tomorrow").
// Same auth/key/model as /api/ai-parse; deliberately narrower in scope: it
// can only move dates/times of tasks it's given, never create or delete.

import Anthropic from '@anthropic-ai/sdk'
import { requirePersonAuth } from './_lib/auth.js'

const RESCHEDULE_SCHEMA = {
  type: 'object',
  properties: {
    moves: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          new_date: { type: 'string', description: 'YYYY-MM-DD' },
          new_start_time: {
            type: ['string', 'null'],
            description: 'HH:MM 24-hour, or null to keep the task\'s existing time'
          }
        },
        required: ['id', 'new_date', 'new_start_time'],
        additionalProperties: false
      }
    }
  },
  required: ['moves'],
  additionalProperties: false
}

function buildSystemPrompt(today) {
  return `You help reschedule existing tasks in a personal planner from a natural-language instruction.
Today's date is ${today} (YYYY-MM-DD). The user may write in Russian, German, or English.
You will receive a JSON list of the user's existing tasks: id, title, date, start_time, category, priority.
Decide which of these EXISTING tasks (by id) the instruction wants moved, and to which new date (and optionally new time).
Rules:
- Only return tasks that are actually in the provided list — never invent an id, never propose a brand new task.
- Resolve relative dates ("tomorrow", "next Monday", "Friday") against today's date.
- If the instruction refers to a whole day ("everything today", "all of tomorrow"), include every task whose date matches that day.
- If no specific new time is mentioned for a task, set new_start_time to null (keep its current time).
- If the instruction doesn't clearly ask to reschedule any of the given tasks, return an empty moves array — do not guess.`
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

  const { text, tasks, today } = req.body || {}
  if (!text) {
    return res.status(400).json({ error: 'Missing "text" in request body' })
  }
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Missing "tasks" array in request body' })
  }

  const resolvedToday = today || new Date().toISOString().slice(0, 10)
  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: buildSystemPrompt(resolvedToday),
      output_config: {
        format: { type: 'json_schema', schema: RESCHEDULE_SCHEMA }
      },
      messages: [
        {
          role: 'user',
          content: `Instruction: ${text}\n\nExisting tasks (JSON): ${JSON.stringify(tasks)}`
        }
      ]
    })

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ moves: [] })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    const parsed = textBlock ? JSON.parse(textBlock.text) : { moves: [] }
    const validIds = new Set(tasks.map((t) => t.id))
    const moves = (parsed.moves || []).filter((m) => validIds.has(m.id))

    return res.status(200).json({ moves })
  } catch (err) {
    return res.status(502).json({ error: 'AI reschedule failed' })
  }
}
