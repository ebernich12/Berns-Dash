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

const env         = loadEnv(ENV_PATH)
const NEWSAPI_KEY = env.NEWSAPI_KEY
const GROQ_KEY    = env.GROQ_KEY || env.GROQ_API_KEY
const GROQ_KEY_2  = env.GROQ_KEY_2
const INGEST_URL  = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET = env.CRON_SECRET
const DB_URL      = env.DATABASE_URL

const SUMMARY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

async function getExistingSnapshot() {
  const pool = new pg.Pool({ connectionString: DB_URL })
  try {
    const res = await pool.query('SELECT data FROM agent_snapshots WHERE agent = $1', ['news-world'])
    return res.rows[0]?.data ?? null
  } finally {
    await pool.end()
  }
}

const RSS_WORLD = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/worldNews' },
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews' },
]

const BLOCKED_SOURCES = new Set([
  'Bleeding Green Nation', 'Big Blue View', 'Deadline', 'Variety', 'Hollywood Reporter',
  'GSMArena.com', 'GSMArena', 'Kotaku', 'Eurogamer', 'Eurogamer.net', 'GamesIndustry.biz',
  'IGN', 'Polygon', 'PC Gamer', 'The Hollywood Reporter', 'TMZ', 'People',
  'Entertainment Weekly', 'E! News', 'Us Weekly',
])

const BLOCKED_KEYWORDS = [
  'nfl draft', 'draft grades', 'nba draft', 'box office', 'moonwalks', 'reunion audio',
  'bravo investigates', 'baby reindeer', 'cretaceous kraken', 'golden orb', 'seafloor',
  'one-year anniversary', 'new haircuts', 'summer house', 'season 10',
  'living nightmare', 'heartbreaking statement', 'speaks out',
  'dave ramsey', 'furniture salesman', 'highest-paid ceo is a furniture',
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
  if (!res.ok || json.error) console.error('[WorldAgent] Groq error:', JSON.stringify(json).slice(0, 200))
  return json.choices?.[0]?.message?.content ?? ''
}

async function groq(messages, max_tokens = 512) {
  const result = await groqCall(GROQ_KEY, messages, max_tokens)
  if (!result && GROQ_KEY_2) {
    console.log('[WorldAgent] primary key empty, retrying with key 2')
    return groqCall(GROQ_KEY_2, messages, max_tokens)
  }
  return result
}

async function scoreHeadlines(headlines) {
  if (!headlines.length) return []
  const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')
  const text = await groq([
    { role: 'system', content: 'Score each headline -1.0 (very negative/bearish) to +1.0 (very positive/bullish), 0.0 neutral. War, crisis, disaster = negative. Peace, growth, breakthrough = positive. Return ONLY a JSON array of numbers. No explanation.' },
    { role: 'user', content: numbered },
  ])
  try {
    const match = text.match(/\[[\s\S]*?\]/)
    return match ? JSON.parse(match[0]).map(s => Math.max(-1, Math.min(1, Number(s) || 0))) : []
  } catch { return [] }
}

async function rankTop10(headlines) {
  if (headlines.length <= 10) return headlines
  const now = Date.now() / 1000
  const list = headlines.map((h, i) =>
    `${i}. [${h.source}] "${h.headline}" | score=${h.sentiment.toFixed(2)} | age=${Math.floor((now - h.datetime) / 60)}min`
  ).join('\n')
  const text = await groq([
    { role: 'system', content: 'Rank headlines by importance: (1) recency — prefer <120min, (2) sentiment extremity — prefer |score|>0.4, (3) source credibility — Reuters > others. Return ONLY a JSON array of 10 indices (0-based). Example: [3,0,7,2,9,1,5,8,4,6]' },
    { role: 'user', content: list },
  ], 128)
  try {
    const match = text.match(/\[[\s\d,\s-]+\]/)
    const indices = match ? JSON.parse(match[0]) : []
    const result = indices.slice(0, 10).map((i) => headlines[i]).filter(Boolean)
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
    { role: 'system', content: 'You are a geopolitical risk analyst writing for a macro hedge fund PM. Return ONLY valid JSON: {"summary":"3-4 sentences on the current geopolitical and macro situation. Name specific countries, conflicts, or policy actions. Explain the second-order market implications — what does this mean for commodities, safe havens, or EM flows? Be precise, not descriptive.","outlook":"Risk-On/Risk-Off/Mixed — one sentence naming the specific trigger or flashpoint driving the call","tailwinds":["specific de-escalation, deal, or positive development — name the parties and stakes","tailwind 2","tailwind 3"],"headwinds":["specific conflict, policy risk, or geopolitical flashpoint — name countries and mechanism","risk 2","risk 3"]}. No markdown, no extra text.' },
    { role: 'user', content: `World sentiment: ${conviction.toFixed(2)}\n\nTop headlines:\n${topLines}` },
  ], 600)
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchNewsAPI(category) {
  const res  = await fetch(`https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=30&apiKey=${NEWSAPI_KEY}`)
  const data = await res.json()
  return (data.articles ?? [])
    .filter(a => a.title && !a.title.includes('[Removed]'))
    .map(a => ({ source: a.source?.name ?? 'NewsAPI', headline: a.title, url: a.url, datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000) }))
}

async function fetchRSS(feed) {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'BernsDashboard/1.0' } })
  const xml = await res.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 15).map(m => {
    const b     = m[1]
    const title = b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? b.match(/<title>(.*?)<\/title>/)?.[1] ?? ''
    const link  = b.match(/<link>(.*?)<\/link>/)?.[1] ?? b.match(/<guid>(.*?)<\/guid>/)?.[1] ?? ''
    const pub   = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    return { source: feed.name, headline: title.trim(), url: link.trim(), datetime: pub ? Math.floor(new Date(pub).getTime() / 1000) : Math.floor(Date.now() / 1000) }
  }).filter(a => a.headline)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[WorldAgent] starting...')

  const existing      = await getExistingSnapshot().catch(() => null)
  const summaryAge    = existing?.summary_updated_at ? Date.now() - new Date(existing.summary_updated_at).getTime() : Infinity
  const reusesSummary = summaryAge < SUMMARY_TTL_MS
  if (reusesSummary) console.log('[WorldAgent] summary fresh, skipping regeneration')

  const [generalRes, rssResults] = await Promise.allSettled([
    fetchNewsAPI('general'),
    Promise.allSettled(RSS_WORLD.map(f => fetchRSS(f))),
  ])

  const general = generalRes.status === 'fulfilled' ? generalRes.value : []
  const rss     = rssResults.status === 'fulfilled'
    ? rssResults.value.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    : []

  const seen = new Set()
  const all  = [...general, ...rss]
    .filter(h => h.headline && isRelevant(h.headline, h.source) && !seen.has(h.headline) && seen.add(h.headline))
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 30)

  const cache = new Map((existing?.headlines ?? []).map(h => [h.url, h.sentiment]))
  const newOnes = all.filter(h => !cache.has(h.url))
  console.log(`[WorldAgent] ${all.length} headlines, ${newOnes.length} new, scoring only those...`)

  const newScores = newOnes.length ? await scoreHeadlines(newOnes.map(h => h.headline)).catch(() => []) : []
  const scoreByUrl = new Map(newOnes.map((h, i) => [h.url, newScores[i] ?? 0]))
  const now     = Math.floor(Date.now() / 1000)
  const scored  = all.map(h => {
    const sentiment = cache.has(h.url) ? cache.get(h.url) : (scoreByUrl.get(h.url) ?? 0)
    return {
      ...h,
      sentiment:   +sentiment.toFixed(3),
      breaking:    (now - h.datetime) < 2700,
      highImpact:  Math.abs(sentiment) >= 0.6,
    }
  })
  const scores = scored.map(h => h.sentiment)

  const conviction = convictionScore(scores)

  const [top10Res, summaryRes] = await Promise.allSettled([
    rankTop10(scored).catch(() => scored.slice(0, 10)),
    reusesSummary ? Promise.resolve(null) : writeSummary(conviction, scored),
  ])

  const newSummary = summaryRes.status === 'fulfilled' ? summaryRes.value : null
  const payload = {
    updated_at:         new Date().toISOString(),
    summary_updated_at: newSummary ? new Date().toISOString() : (existing?.summary_updated_at ?? null),
    world_sentiment:    { score: +conviction.toFixed(3), label: label(conviction) },
    headlines:          scored,
    top10:              top10Res.status === 'fulfilled' ? top10Res.value : scored.slice(0, 10),
    summary:            newSummary ?? (reusesSummary ? existing.summary : null),
  }

  console.log(`[WorldAgent] conviction=${conviction.toFixed(3)} (${label(conviction)}), top10=${payload.top10.length}`)

  const res    = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news-world', data: payload }),
  })
  console.log('[WorldAgent] ingest:', await res.json())
}

run().catch(err => { console.error('[WorldAgent] fatal:', err); process.exit(1) })
