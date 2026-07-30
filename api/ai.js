// Vercel Serverless Function — single entry point for every AI call
// (parse / reschedule / ask / digest / weekly-review), dispatched by
// req.body.action. Consolidated from 5 separate functions to stay under the
// Hobby plan's 12-function-per-deployment limit as more endpoints were
// added — behavior of each action is unchanged from its old standalone file.
//
// КРИТИЧНО ПО ПРИВАТНОСТИ (см. ТЗ, раздел 5):
// - НЕ логировать тело запроса (console.log(text) и т.п.) в проде
// - НЕ сохранять историю обращений в файл/БД
// - ключ читается только из process.env, никогда не возвращается клиенту

import Anthropic from '@anthropic-ai/sdk'
import { requirePersonAuth } from './_lib/auth.js'

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
          emoji: { type: 'string', description: 'A single emoji representing this task' },
          confidence: { type: 'number', description: '0.0 to 1.0' }
        },
        required: ['title', 'date', 'start_time', 'duration_minutes', 'priority', 'emoji', 'confidence'],
        additionalProperties: false
      }
    }
  },
  required: ['suggestions'],
  additionalProperties: false
}

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
            description: "HH:MM 24-hour, or null to keep the task's existing time"
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

function parsePrompt(today) {
  return `You parse a user's natural-language scheduling request into structured task suggestions.
Today's date is ${today} (YYYY-MM-DD). The user may write in Russian, German, or English.
You will also receive a compact list of already-scheduled slots (the user's busy times, ±7 days).
Do not worry about detecting conflicts yourself — that is handled separately downstream.
The user may attach a photo or a PDF document instead of (or in addition to) typing — an
invitation, an appointment card, a screenshot, a booking confirmation, a scanned document
with a date/time on it. Read any relevant text in the photo or document and extract the
same fields from it as you would from typed text. If it contains no date/time/scheduling
information at all, return an empty suggestions array.
For each distinct task/appointment/reminder implied by the user's text or photo, produce one suggestion with:
- title: short, in the same language the user wrote in
- date: resolved absolute date in YYYY-MM-DD, based on today's date and relative terms like "tomorrow"/"Thursday"
- start_time: HH:MM 24-hour. If the user gave no explicit time for a "find me time for X" style request, pick a reasonable free slot outside the provided busy times AND outside the times of the other suggestions you are generating in this same response — never let two of your own suggestions overlap each other.
- duration_minutes: your best estimate if not stated explicitly
- priority: "low" | "medium" | "high"
- emoji: a single emoji that best fits this specific task (e.g. 💊 for medication, 🏋️ for a workout, 🦷 for a dentist visit) — pick something concrete and fitting, not generic like 📅
- confidence: 0.0-1.0, how confident you are in this interpretation. Use a lower value when the request is ambiguous (missing date, vague duration, unclear intent).
If the text contains no actionable scheduling request, return an empty suggestions array.`
}

function reschedulePrompt(today) {
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

function askPrompt(today) {
  return `You answer questions about the user's own schedule in a personal planner app.
Today's date is ${today} (YYYY-MM-DD). The user may write in Russian, German, or English — always reply in the same language as the question.
You will receive a JSON list of their tasks (date, start_time, duration_minutes, title, priority, category) for the surrounding weeks.
Answer the question directly and concisely (1-3 sentences), based only on the provided data. Resolve relative dates ("Thursday", "next week") against today's date.
If the question asks about free time, reason about gaps between the listed tasks.
If you don't have enough data to answer, say so briefly instead of guessing. Never suggest creating, editing, or moving tasks — that is a different feature; just answer the question.`
}

function digestPrompt() {
  return `You write a very short daily briefing for a personal scheduling app.
The user may write/read in Russian, German, or English — always reply in the language given as "locale" (ru, de, or en).
You will receive today's task list as JSON (title, start_time, duration_minutes, priority).
Write 1-2 short sentences: mention how busy the day looks, call out back-to-back or tightly packed times if any, and nudge toward the highest-priority item if one stands out. Be warm and concise, no bullet points, no greeting, no markdown.
If the task list is empty, write one short encouraging sentence about a free day.`
}

function weeklyReviewPrompt() {
  return `You write a very short weekly reflection for a personal scheduling app.
The user may write/read in Russian, German, or English — always reply in the language given as "locale" (ru, de, or en).
You will receive stats for the last 7 days as JSON: total tasks, how many were completed, a breakdown by category, and a breakdown by priority.
Write 2-3 short sentences: acknowledge the completion rate (be encouraging even if it's low), note one interesting pattern if there is one (e.g. a category that got neglected, or a lot of high-priority items), and end with one gentle, concrete nudge for the coming week. Warm, concise, no bullet points, no greeting, no markdown.
If total is 0, write one short encouraging sentence about a quiet week.`
}

async function handleParse(client, body) {
  const { text, scheduleContext, today, attachment } = body
  if (!text && !attachment?.base64) return { status: 400, json: { error: 'Missing "text" or "attachment" in request body' } }

  const resolvedToday = today || new Date().toISOString().slice(0, 10)
  const userContent = []
  if (attachment?.base64 && attachment?.mediaType === 'application/pdf') {
    userContent.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: attachment.base64 } })
  } else if (attachment?.base64 && attachment?.mediaType) {
    userContent.push({ type: 'image', source: { type: 'base64', media_type: attachment.mediaType, data: attachment.base64 } })
  }
  userContent.push({
    type: 'text',
    text: `User request: ${text || '(see attached photo/document)'}\n\nExisting busy slots (JSON): ${JSON.stringify(scheduleContext || [])}`
  })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    system: parsePrompt(resolvedToday),
    output_config: { format: { type: 'json_schema', schema: SUGGESTION_SCHEMA } },
    messages: [{ role: 'user', content: userContent }]
  })

  if (response.stop_reason === 'refusal') return { status: 200, json: { suggestions: [] } }
  const textBlock = response.content.find((b) => b.type === 'text')
  const parsed = textBlock ? JSON.parse(textBlock.text) : { suggestions: [] }
  return { status: 200, json: { suggestions: parsed.suggestions || [] } }
}

async function handleReschedule(client, body) {
  const { text, tasks, today } = body
  if (!text) return { status: 400, json: { error: 'Missing "text" in request body' } }
  if (!Array.isArray(tasks)) return { status: 400, json: { error: 'Missing "tasks" array in request body' } }

  const resolvedToday = today || new Date().toISOString().slice(0, 10)
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: reschedulePrompt(resolvedToday),
    output_config: { format: { type: 'json_schema', schema: RESCHEDULE_SCHEMA } },
    messages: [{ role: 'user', content: `Instruction: ${text}\n\nExisting tasks (JSON): ${JSON.stringify(tasks)}` }]
  })

  if (response.stop_reason === 'refusal') return { status: 200, json: { moves: [] } }
  const textBlock = response.content.find((b) => b.type === 'text')
  const parsed = textBlock ? JSON.parse(textBlock.text) : { moves: [] }
  const validIds = new Set(tasks.map((t) => t.id))
  const moves = (parsed.moves || []).filter((m) => validIds.has(m.id))
  return { status: 200, json: { moves } }
}

async function handleAsk(client, body) {
  const { question, tasks, today } = body
  if (!question) return { status: 400, json: { error: 'Missing "question" in request body' } }
  if (!Array.isArray(tasks)) return { status: 400, json: { error: 'Missing "tasks" array in request body' } }

  const resolvedToday = today || new Date().toISOString().slice(0, 10)
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    system: askPrompt(resolvedToday),
    messages: [{ role: 'user', content: `Question: ${question}\n\nTasks (JSON): ${JSON.stringify(tasks)}` }]
  })

  if (response.stop_reason === 'refusal') return { status: 200, json: { answer: '' } }
  const textBlock = response.content.find((b) => b.type === 'text')
  return { status: 200, json: { answer: textBlock?.text?.trim() || '' } }
}

async function handleDigest(client, body) {
  const { tasks, locale } = body
  if (!Array.isArray(tasks)) return { status: 400, json: { error: 'Missing "tasks" array in request body' } }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    system: digestPrompt(),
    messages: [{ role: 'user', content: `locale: ${locale || 'en'}\n\nTasks (JSON): ${JSON.stringify(tasks)}` }]
  })

  if (response.stop_reason === 'refusal') return { status: 200, json: { digest: '' } }
  const textBlock = response.content.find((b) => b.type === 'text')
  return { status: 200, json: { digest: textBlock?.text?.trim() || '' } }
}

async function handleWeeklyReview(client, body) {
  const { stats, locale } = body
  if (!stats || typeof stats.total !== 'number') return { status: 400, json: { error: 'Missing "stats" in request body' } }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 220,
    system: weeklyReviewPrompt(),
    messages: [{ role: 'user', content: `locale: ${locale || 'en'}\n\nStats (JSON): ${JSON.stringify(stats)}` }]
  })

  if (response.stop_reason === 'refusal') return { status: 200, json: { review: '' } }
  const textBlock = response.content.find((b) => b.type === 'text')
  return { status: 200, json: { review: textBlock?.text?.trim() || '' } }
}

const ACTIONS = {
  parse: handleParse,
  reschedule: handleReschedule,
  ask: handleAsk,
  digest: handleDigest,
  'weekly-review': handleWeeklyReview
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

  const { action, ...body } = req.body || {}
  const runAction = ACTIONS[action]
  if (!runAction) {
    return res.status(400).json({ error: `Unknown or missing "action": ${action}` })
  }

  const client = new Anthropic({ apiKey })

  try {
    const { status, json } = await runAction(client, body)
    return res.status(status).json(json)
  } catch (err) {
    return res.status(502).json({ error: `AI ${action} failed` })
  }
}
