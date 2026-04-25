import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
const INGEST_URL  = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET = env.CRON_SECRET

const RSS_WORLD = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/worldNews' },
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews' },
]

// ── Sentiment ─────────────────────────────────────────────────────────────────

async function groq(messages, max_tokens = 512) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens, temperature: 0, messages }),
  })
  const d = await res.json()
  return d.choices?.[0]?.message?.content ?? ''
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
    return indices.slice(0, 10).map((i) => headlines[i]).filter(Boolean)
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
    .filter(h => h.headline && !seen.has(h.headline) && seen.add(h.headline))
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 30)

  console.log(`[WorldAgent] ${all.length} headlines, scoring...`)

  const scores  = await scoreHeadlines(all.map(h => h.headline)).catch(() => [])
  const now     = Math.floor(Date.now() / 1000)
  const scored  = all.map((h, i) => ({
    ...h,
    sentiment:   +(scores[i] ?? 0).toFixed(3),
    breaking:    (now - h.datetime) < 2700,
    highImpact:  Math.abs(scores[i] ?? 0) >= 0.6,
  }))

  const conviction = convictionScore(scores)
  const top10      = await rankTop10(scored).catch(() => scored.slice(0, 10))

  const payload = {
    updated_at:      new Date().toISOString(),
    world_sentiment: { score: +conviction.toFixed(3), label: label(conviction) },
    headlines:       scored,
    top10,
  }

  console.log(`[WorldAgent] conviction=${conviction.toFixed(3)} (${label(conviction)}), top10=${top10.length}`)

  const res    = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news-world', data: payload }),
  })
  console.log('[WorldAgent] ingest:', await res.json())
}

run().catch(err => { console.error('[WorldAgent] fatal:', err); process.exit(1) })
