#!/usr/bin/env node
// scripts/cally.mjs — Calendar Agent (Gemini 2.0 Flash)
// Fetches Canvas ICS, Google Calendar, FRED releases, Earnings → posts to dashboard

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
  // Returns YYYY-MM-DD in Eastern Time (UTC-4 EDT / UTC-5 EST)
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
      // datetime: 20260422T040000Z
      const y = dtRaw.slice(0,4), mo = dtRaw.slice(4,6), d = dtRaw.slice(6,8)
      const h = dtRaw.slice(9,11), mi = dtRaw.slice(11,13)
      const utc = new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`)
      date = toET(utc)
    } else {
      // date only: 20260422
      date = `${dtRaw.slice(0,4)}-${dtRaw.slice(4,6)}-${dtRaw.slice(6,8)}`
    }

    const rawSummary = (get('SUMMARY') || '').replace(/\\,/g, ',')
    // Canvas format: "Title [Course Name]"
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

async function geminiCall(prompt, keys) {
  const keyList = Array.isArray(keys) ? keys : [keys]
  for (const key of keyList) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contents:         [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      }
    )
    if (res.status === 429) { log(`Gemini key exhausted, trying next...`); continue }
    if (!res.ok) { const b = await res.text().catch(() => ''); throw new Error(`Gemini HTTP ${res.status}: ${b.slice(0,200)}`) }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  }
  throw new Error('All Gemini API keys exhausted (429)')
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

// ── Economic Calendar (Finnhub) ───────────────────────────────────────────────
async function fetchEcon(apiKey) {
  log('Fetching Finnhub economic calendar...')
  const today = toET(new Date())
  const in7   = toET(daysFromNow(7))
  const data  = await fetchJSON(
    `https://finnhub.io/api/v1/calendar/economic?from=${today}&to=${in7}&token=${apiKey}`
  )
  return (data.economicCalendar || [])
    .filter(e => e.country === 'US' && (e.impact === 'high' || e.impact === 'medium'))
    .map(e => ({ event: e.event, date: e.date, time: e.time || null, impact: e.impact }))
}

// ── Gemini econ curation ──────────────────────────────────────────────────────
async function curateEcon(events, geminiKeys) {
  log(`Curating ${events.length} economic events with Gemini...`)
  if (events.length === 0) return []

  const prompt = `You are a macro analyst. From this list of upcoming US economic data releases, pick the top 7 most market-moving (or all if fewer than 7). For each, add a "summary" field: one sentence on what this release measures and why traders watch it. Return ONLY a JSON array with fields: event, date, time, impact, summary. No markdown, no explanation.\n\n${JSON.stringify(events)}`

  try {
    const raw   = await geminiCall(prompt, geminiKeys)
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch (e) {
    log(`Gemini econ failed (${e.message}), returning raw events`)
    return events.slice(0, 7)
  }
}

// ── Earnings ──────────────────────────────────────────────────────────────────
async function fetchEarnings(apiKey) {
  log('Fetching earnings...')
  const today = toET(new Date())
  const in7   = toET(daysFromNow(7))
  const data  = await fetchJSON(
    `https://finnhub.io/api/v1/calendar/earnings?from=${today}&to=${in7}&token=${apiKey}`
  )
  return (data.earningsCalendar || [])
    .filter(e => e.symbol)
    .map(e => ({
      symbol:      e.symbol,
      date:        e.date,
      hour:        e.hour || 'amc',
      epsEstimate: e.epsEstimate ?? null,
    }))
    .slice(0, 20)
}

async function curateEarnings(earnings, geminiKeys) {
  log(`Curating ${earnings.length} earnings reports with Gemini...`)
  if (earnings.length === 0) return []

  const prompt = `You are a financial analyst. From this list of upcoming earnings reports, pick the top 7 most market-moving companies — prioritize large-cap, high analyst attention, sector bellwethers (e.g. FAANG, banks, industrials). For each, add a "name" field (full company name, e.g. "Apple Inc.") and a "summary" field (one sentence on what to watch for in their report). Return ONLY a JSON array with fields: symbol, name, date, hour, epsEstimate, summary. No markdown, no explanation.\n\n${JSON.stringify(earnings)}`

  try {
    const raw   = await geminiCall(prompt, geminiKeys)
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch (e) {
    log(`Gemini earnings failed (${e.message}), returning earliest 7 by date`)
    return earnings.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)
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
                    'GOOGLE_REFRESH_TOKEN','FINNHUB_API_KEY',
                    'GEMINI_API_KEY','CRON_SECRET']
  const missing = required.filter(k => !env[k])
  if (missing.length) { log(`Missing env vars: ${missing.join(', ')}`); process.exit(1) }

  const geminiKeys = [env.GEMINI_API_KEY, env.GEMINI_API_KEY_2].filter(Boolean)
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
        const econ = await fetchEcon(env.FINNHUB_API_KEY)
        results.economic = await curateEcon(econ, geminiKeys)
        log(`Econ: ${results.economic.length} curated events`)
      } catch (e) { log(`ERROR Econ: ${e.message}`) }
      try {
        await new Promise(r => setTimeout(r, 4000))
        const earn = await fetchEarnings(env.FINNHUB_API_KEY)
        results.earnings = await curateEarnings(earn, geminiKeys)
        log(`Earnings: ${results.earnings.length} curated reports`)
      } catch (e) { log(`ERROR Earnings: ${e.message}`) }
    })(),
  ])

  await postToIngest(results, env.CRON_SECRET)
  log('=== Cally done ===')
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1) })
