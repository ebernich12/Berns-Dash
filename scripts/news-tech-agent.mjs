import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH  = path.join(__dirname, '..', '.env.local')

function loadEnv(fp) {
  const env = {}
  try {
    for (const line of readFileSync(fp, 'utf-8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
  } catch {}
  return env
}

const env          = loadEnv(ENV_PATH)
const NEWSAPI_KEY  = env.NEWSAPI_KEY
const FINNHUB_KEY  = env.FINNHUB_API_KEY
const GROQ_KEY     = env.GROQ_KEY || env.GROQ_API_KEY
const GROQ_KEY_2   = env.GROQ_KEY_2
const INGEST_URL   = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET  = env.CRON_SECRET
const DB_URL       = env.DATABASE_URL

const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

async function getExistingSnapshot() {
  const pool = new pg.Pool({ connectionString: DB_URL })
  try {
    const res = await pool.query('SELECT data FROM agent_snapshots WHERE agent = $1', ['news-tech'])
    return res.rows[0]?.data ?? null
  } finally {
    await pool.end()
  }
}

const TECH_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSM']

const BLOCKED_SOURCES = new Set([
  'Kotaku', 'Eurogamer', 'Eurogamer.net', 'Warhammer Community', 'Warhammer-community.com',
  'GamesIndustry.biz', 'IGN', 'Polygon', 'PC Gamer', 'Rock Paper Shotgun', 'VG247',
  'GameSpot', 'Giant Bomb', 'Destructoid', 'The Gamer', 'Game Rant',
])

const BLOCKED_KEYWORDS = [
  'warhammer', 'dildos', 'haircuts', 'dave ramsey', 'furniture salesman',
  'clair obscur', 'expedition 33', 'atari', 'emulation', 'city of ash',
  'painters enter', 'one-year anniversary', 'new haircuts',
]

function isRelevant(headline, source) {
  if (BLOCKED_SOURCES.has(source)) return false
  const lower = headline.toLowerCase()
  if (BLOCKED_KEYWORDS.some(kw => lower.includes(kw))) return false
  return true
}

// ── Sentiment ─────────────────────────────────────────────────────────────────

async function groqCall(key, messages, max_tokens) {
  const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens, temperature: 0, messages }),
  })
  const json = await res.json()
  if (!res.ok || json.error) console.error('[TechAgent] Groq error:', JSON.stringify(json).slice(0, 200))
  return json.choices?.[0]?.message?.content ?? ''
}

async function groq(messages, max_tokens = 512) {
  const result = await groqCall(GROQ_KEY, messages, max_tokens)
  if (!result && GROQ_KEY_2) {
    console.log('[TechAgent] primary key empty, retrying with key 2')
    return groqCall(GROQ_KEY_2, messages, max_tokens)
  }
  return result
}

async function scoreHeadlines(headlines) {
  if (!headlines.length) return []
  const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')
  const text = await groq([
    { role: 'system', content: 'Score each tech headline -1.0 (very bearish) to +1.0 (very bullish), 0.0 neutral. Consider: earnings beats/misses, product launches, regulatory actions, layoffs, AI breakthroughs. Return ONLY a JSON array of numbers.' },
    { role: 'user', content: numbered },
  ])
  try {
    const match = text.match(/\[[\s\S]*?\]/)
    return match ? JSON.parse(match[0]).map(s => Math.max(-1, Math.min(1, Number(s) || 0))) : []
  } catch { return [] }
}

async function rankTop10(headlines) {
  if (headlines.length <= 10) return headlines
  const now  = Date.now() / 1000
  const list = headlines.map((h, i) =>
    `${i}. [${h.source}] "${h.headline}" | score=${h.sentiment.toFixed(2)} | age=${Math.floor((now - h.datetime) / 60)}min`
  ).join('\n')
  const text = await groq([
    { role: 'system', content: 'Rank tech headlines by importance: (1) recency <120min, (2) |score|>0.4, (3) major companies (NVDA/AAPL/MSFT/GOOGL/META) > others. Return ONLY a JSON array of 10 indices. Example: [3,0,7,2,9,1,5,8,4,6]' },
    { role: 'user', content: list },
  ], 128)
  try {
    const match   = text.match(/\[[\s\d,\s-]+\]/)
    const indices = match ? JSON.parse(match[0]) : []
    const result = indices.slice(0, 10).map(i => headlines[i]).filter(Boolean)
    return result.length > 0 ? result : headlines.slice(0, 10)
  } catch { return headlines.slice(0, 10) }
}

function convictionScore(scores) {
  if (!scores.length) return 0
  const avg  = scores.reduce((s, x) => s + x, 0) / scores.length
  const d    = avg * 0.8
  const bull = scores.filter(s => s >  0.1).length
  const bear = scores.filter(s => s < -0.1).length
  const bB   = bear === 0 ? (bull >= 2 ? 0.1 : 0) : bull / bear >= 2 ? 0.1 : 0
  const beB  = bull === 0 ? (bear >= 2 ? -0.1 : 0) : bear / bull >= 2 ? -0.1 : 0
  return Math.max(-1, Math.min(1, d + bB + beB))
}

function label(score) {
  return score > 0.3 ? 'Bullish' : score < -0.3 ? 'Bearish' : 'Neutral'
}

async function writeSummary(conviction, headlines) {
  const topLines = headlines.slice(0, 8).map(h => `- ${h.headline} (${h.source})`).join('\n')
  const text = await groq([
    { role: 'system', content: 'You are a tech sector analyst at a top-tier fund writing for a PM who reads every earnings transcript. Return ONLY valid JSON: {"summary":"3-4 sentences. Name specific companies, products, or earnings data points. Explain what the news implies for AI capex, semiconductor cycles, or ad revenue — pick whichever is most relevant right now. No vague sector-level commentary.","outlook":"Bullish/Bearish/Neutral — one sentence naming the specific company, product cycle, or regulatory development driving the view","tailwinds":["specific company or product catalyst with data — e.g. NVDA H100 lead times compressing → margin expansion","tailwind 2","tailwind 3"],"headwinds":["specific risk with company name or regulatory detail","risk 2","risk 3"]}. No markdown, no extra text.' },
    { role: 'user', content: `Tech sentiment: ${conviction.toFixed(2)}\n\nTop headlines:\n${topLines}` },
  ], 600)
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchNewsAPI() {
  const res  = await fetch(`https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=30&apiKey=${NEWSAPI_KEY}`)
  const data = await res.json()
  return (data.articles ?? [])
    .filter(a => a.title && !a.title.includes('[Removed]'))
    .map(a => ({ source: a.source?.name ?? 'NewsAPI', headline: a.title, url: a.url, datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000) }))
}

async function fetchTickerNews(ticker) {
  const to   = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
  const res  = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`)
  const data = await res.json()
  return Array.isArray(data) ? data.slice(0, 5).map(h => ({ source: h.source || 'Finnhub', headline: h.headline, url: h.url, datetime: h.datetime })) : []
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[TechAgent] starting...')

  const existing      = await getExistingSnapshot().catch(() => null)
  const summaryAge    = existing?.summary_updated_at ? Date.now() - new Date(existing.summary_updated_at).getTime() : Infinity
  const reusesSummary = summaryAge < SUMMARY_TTL_MS
  if (reusesSummary) console.log('[TechAgent] summary fresh, skipping regeneration')

  const [newsAPIRes, ...tickerResults] = await Promise.allSettled([
    fetchNewsAPI(),
    ...TECH_TICKERS.map(t => fetchTickerNews(t)),
  ])

  const newsAPI  = newsAPIRes.status === 'fulfilled' ? newsAPIRes.value : []
  const tickerNews = tickerResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  const seen = new Set()
  const all  = [...newsAPI, ...tickerNews]
    .filter(h => h.headline && isRelevant(h.headline, h.source) && !seen.has(h.headline) && seen.add(h.headline))
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 30)

  console.log(`[TechAgent] ${all.length} headlines, scoring...`)

  const scores = await scoreHeadlines(all.map(h => h.headline)).catch(() => [])
  const now    = Math.floor(Date.now() / 1000)
  const scored = all.map((h, i) => ({
    ...h,
    sentiment:  +(scores[i] ?? 0).toFixed(3),
    breaking:   (now - h.datetime) < 2700,
    highImpact: Math.abs(scores[i] ?? 0) >= 0.6,
  }))

  const conviction = convictionScore(scores)

  const [top10Res, summaryRes] = await Promise.allSettled([
    rankTop10(scored).catch(() => scored.slice(0, 10)),
    reusesSummary ? Promise.resolve(null) : writeSummary(conviction, scored),
  ])

  const newSummary = summaryRes.status === 'fulfilled' ? summaryRes.value : null
  const payload = {
    updated_at:         new Date().toISOString(),
    summary_updated_at: newSummary ? new Date().toISOString() : (existing?.summary_updated_at ?? null),
    tech_sentiment:     { score: +conviction.toFixed(3), label: label(conviction) },
    headlines:          scored,
    top10:          top10Res.status === 'fulfilled' ? top10Res.value : scored.slice(0, 10),
    summary:        newSummary ?? (reusesSummary ? existing.summary : null),
  }

  console.log(`[TechAgent] conviction=${conviction.toFixed(3)} (${label(conviction)}), top10=${payload.top10.length}`)

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news-tech', data: payload }),
  })
  console.log('[TechAgent] ingest:', await res.json())
}

run().catch(err => { console.error('[TechAgent] fatal:', err); process.exit(1) })
