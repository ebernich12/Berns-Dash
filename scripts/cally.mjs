#!/usr/bin/env node
// scripts/cally.mjs — Calendar Agent (Groq llama-3.3-70b)
// Fetches Canvas ICS, Google Calendar, Earnings → posts to dashboard

import { readFileSync, appendFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH  = resolve(__dirname, '..', '.env.local')
const LOG_PATH  = resolve(__dirname, '..', 'cally.log')

// ── env ───────────────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  const env = {}
  try {
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  } catch {}
  return env
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stdout.write(line)
  try { appendFileSync(LOG_PATH, line) } catch {}
}

// ── date helpers ──────────────────────────────────────────────────────────────
function toET(d) {
  const offset = isDST(d) ? 4 : 5
  return new Date(d.getTime() - offset * 3600_000).toISOString().slice(0, 10)
}

function isDST(d) {
  const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset()
  const jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset()
  return d.getTimezoneOffset() < Math.max(jan, jul)
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// ── ICS parser ────────────────────────────────────────────────────────────────
function parseICS(text) {
  const events = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const get = (key) => {
      const m = block.match(new RegExp(`^${key}[^:\\r\\n]*:(.+)$`, 'm'))
      return m ? m[1].trim().replace(/\\n/g, '\n') : null
    }

    const dtRaw = get('DTSTART') || get('DUE')
    if (!dtRaw) continue

    let date
    if (dtRaw.length >= 13) {
      const y = dtRaw.slice(0,4), mo = dtRaw.slice(4,6), d = dtRaw.slice(6,8)
      const h = dtRaw.slice(9,11), mi = dtRaw.slice(11,13)
      const utc = new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`)
      date = toET(utc)
    } else {
      date = `${dtRaw.slice(0,4)}-${dtRaw.slice(4,6)}-${dtRaw.slice(6,8)}`
    }

    const rawSummary = (get('SUMMARY') || '').replace(/\\,/g, ',')
    const courseMatch = rawSummary.match(/^(.+?)\s*\[(.+)\]$/)
    const title  = courseMatch ? courseMatch[1].trim() : rawSummary
    const course = courseMatch ? courseMatch[2].trim() : ''
    const cats   = (get('CATEGORIES') || '').toLowerCase()
    const type   = cats.includes('assignment') ? 'assignment'
                 : cats.includes('quiz')       ? 'quiz'
                 : 'event'

    events.push({ title, course, date, type })
  }
  return events
}

// ── fetch helpers ─────────────────────────────────────────────────────────────
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${url}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

async function groqCall(prompt, apiKey) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens:  2048,
    }),
  })
  if (!res.ok) {
    const b = await res.text().catch(() => '')
    throw new Error(`Groq HTTP ${res.status}: ${b.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '[]'
}

// ── Canvas ────────────────────────────────────────────────────────────────────
async function fetchCanvas(icsUrl) {
  log('Fetching Canvas ICS...')
  const url = icsUrl.replace(/^webcal:\/\//i, 'https://')
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Canvas ICS HTTP ${res.status}`)
  const text = await res.text()
  const all   = parseICS(text)
  const today = toET(new Date())
  const end   = toET(daysFromNow(14))
  return all.filter(e => e.date >= today && e.date <= end)
}

// ── Google Calendar ───────────────────────────────────────────────────────────
async function fetchGcal(clientId, clientSecret, refreshToken) {
  log('Fetching Google Calendar...')

  const tokenData = await fetchJSON('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  if (!tokenData.access_token) throw new Error('No Google access token returned')

  const params = new URLSearchParams({
    timeMin:      new Date().toISOString(),
    timeMax:      daysFromNow(7).toISOString(),
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '50',
  })

  const data = await fetchJSON(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  )

  return (data.items || []).map(e => ({
    id:    e.id,
    title: e.summary || '(no title)',
    date:  e.start.date || e.start.dateTime?.slice(0, 10),
    time:  e.start.dateTime
      ? new Date(e.start.dateTime).toLocaleTimeString('en-US', {
          timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit'
        })
      : 'All day',
    link:  e.hangoutLink || e.htmlLink || null,
  }))
}

// ── Earnings ──────────────────────────────────────────────────────────────────
async function fetchEarnings(apiKey) {
  log('Fetching earnings...')
  const today = toET(new Date())
  const in14  = toET(daysFromNow(14))
  const data  = await fetchJSON(
    `https://finnhub.io/api/v1/calendar/earnings?from=${today}&to=${in14}&token=${apiKey}`
  )
  return (data.earningsCalendar || [])
    .filter(e => {
      if (!e.symbol) return false
      const day = new Date(e.date + 'T12:00:00').getDay()
      return day !== 0 && day !== 6 // drop Saturday and Sunday
    })
    .map(e => ({
      symbol:      e.symbol,
      date:        e.date,
      hour:        e.hour || 'amc',
      epsEstimate: e.epsEstimate ?? null,
    }))
    .slice(0, 40)
}

async function curateEarnings(earnings, groqKey) {
  log(`Curating ${earnings.length} earnings reports with Groq...`)
  if (earnings.length === 0) return []

  const prompt = `You are a senior sell-side equity analyst preparing an earnings preview briefing for a finance dashboard. From the list of upcoming earnings reports below, select the 10 most market-moving companies.

SELECTION PRIORITY: mega-cap tech (FAANG, MSFT, NVDA), major banks and financials, sector bellwethers (industrials, consumer staples, healthcare), companies with high analyst coverage and options activity.

For each selected company, return EXACTLY this JSON structure:
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "sector": "Technology",
  "date": "2026-04-28",
  "hour": "amc",
  "epsEstimate": 1.65,
  "why_it_matters": "Single sentence on why this company moves the broader market or its sector — be specific about market cap, index weight, or macro read-through.",
  "what_to_watch": [
    "Specific metric or guidance item #1 — e.g. iPhone unit sales vs. 52M consensus",
    "Specific metric or guidance item #2 — e.g. Services revenue growth vs. 14% YoY estimate",
    "Specific metric or guidance item #3 — e.g. FY26 EPS guidance vs. $7.20 street estimate"
  ],
  "summary": "One punchy sentence capturing the single biggest question heading into this report."
}

STRICT RULES:
- Return ONLY a valid JSON array. No markdown, no code blocks, no explanation before or after.
- why_it_matters must name specific numbers, weights, or macro linkages — not generic phrases like "widely watched" or "closely followed".
- Each what_to_watch item must name a specific metric and a specific consensus estimate or comparison point. Never write "revenue growth" alone — write "Services revenue growth vs. 14% YoY consensus".
- summary must be one sentence, punchy, and not repeat what_to_watch verbatim.
- Sort the array by date ascending.
- All 9 fields are required for every entry. Do not omit any.

EARNINGS LIST:
${JSON.stringify(earnings)}`

  try {
    const raw   = await groqCall(prompt, groqKey)
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch (e) {
    log(`Groq earnings failed (${e.message}), returning earliest 10 by date`)
    return earnings.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
  }
}

// ── Ingest ────────────────────────────────────────────────────────────────────
async function postToIngest(data, secret) {
  log('Posting to ingest...')
  const res = await fetch('https://bernsapp.com/api/ingest', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({ agent: 'calendar', data }),
  })
  if (!res.ok) throw new Error(`Ingest HTTP ${res.status}`)
  const json = await res.json()
  log(`Ingest OK — updated_at=${json.updated_at}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Cally starting ===')
  const env = loadEnv(ENV_PATH)

  const required = ['CANVAS_ICS_URL','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET',
                    'GOOGLE_REFRESH_TOKEN','FINNHUB_API_KEY','GROQ_API_KEY','CRON_SECRET']
  const missing = required.filter(k => !env[k])
  if (missing.length) { log(`Missing env vars: ${missing.join(', ')}`); process.exit(1) }

  const results = { canvas: [], google: [], economic: [], earnings: [] }

  await Promise.allSettled([
    fetchCanvas(env.CANVAS_ICS_URL)
      .then(r  => { results.canvas   = r; log(`Canvas: ${r.length} assignments`) })
      .catch(e => log(`ERROR Canvas: ${e.message}`)),

    fetchGcal(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REFRESH_TOKEN)
      .then(r  => { results.google   = r; log(`Google Cal: ${r.length} events`) })
      .catch(e => log(`ERROR Google: ${e.message}`)),

    (async () => {
      try {
        const earn = await fetchEarnings(env.FINNHUB_API_KEY)
        results.earnings = await curateEarnings(earn, env.GROQ_API_KEY)
        log(`Earnings: ${results.earnings.length} curated reports`)
      } catch (e) { log(`ERROR Earnings: ${e.message}`) }
    })(),
  ])

  await postToIngest(results, env.CRON_SECRET)
  log('=== Cally done ===')
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1) })