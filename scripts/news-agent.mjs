import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH  = path.join(__dirname, '..', '.env.local')

function loadEnv(filePath) {
  const env = {}
  try {
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  } catch {}
  return env
}

const env         = loadEnv(ENV_PATH)
const FINNHUB_KEY = env.FINNHUB_API_KEY
const FRED_KEY    = env.FRED_API_KEY
const GROQ_KEY    = env.GROQ_API_KEY
const NEWSAPI_KEY = env.NEWSAPI_KEY
const INGEST_URL  = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET = env.CRON_SECRET

// ── Sectors ───────────────────────────────────────────────────────────────────

const SECTORS = {
  Technology:               'XLK',
  Energy:                   'XLE',
  Financials:               'XLF',
  Healthcare:               'XLV',
  'Consumer Discretionary': 'XLY',
  'Consumer Staples':       'XLP',
  Industrials:              'XLI',
  'Fixed Income':           'TLT',
}

// ── FRED ──────────────────────────────────────────────────────────────────────

const FRED_SERIES = [
  { id: 'FEDFUNDS', label: 'Fed Funds Rate' },
  { id: 'DGS10',    label: '10Y Treasury'   },
  { id: 'T10Y2Y',   label: '10Y–2Y Spread'  },
  { id: 'CPIAUCSL', label: 'CPI'            },
]

// ── RSS feeds ─────────────────────────────────────────────────────────────────

const RSS_FEEDS = [
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/businessNews'          },
  { name: 'WSJ',     url: 'https://feeds.content.dowjones.io/public/rss/moneymktg' },
  { name: 'FT',      url: 'https://www.ft.com/rss/home'                            },
]

// ── Sentiment engine ──────────────────────────────────────────────────────────

async function scoreHeadlines(headlines) {
  if (headlines.length === 0) return []
  const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', max_tokens: 512, temperature: 0,
      messages: [
        { role: 'system', content: 'Score each headline -1.0 (very bearish/negative) to +1.0 (very bullish/positive), 0.0 neutral. For world news: negative events (war, disaster, crisis) score negative; positive events (peace, growth, breakthrough) score positive. Return ONLY a JSON array of numbers. No explanation.' },
        { role: 'user', content: numbered },
      ],
    }),
  })
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? '[]'
  try {
    const match = text.match(/\[[\s\S]*?\]/)
    const scores = match ? JSON.parse(match[0]) : []
    return scores.map(s => Math.max(-1, Math.min(1, Number(s) || 0)))
  } catch { return [] }
}

function convictionScore(scores) {
  if (scores.length === 0) return 0
  const avg      = scores.reduce((s, x) => s + x, 0) / scores.length
  const dampened = avg * 0.8
  const bull = scores.filter(s => s >  0.1).length
  const bear = scores.filter(s => s < -0.1).length
  const bullBonus = bear === 0 ? (bull >= 2 ? 0.1 : 0) : (bull / bear >= 2 ? 0.1 : 0)
  const bearBonus = bull === 0 ? (bear >= 2 ? -0.1 : 0) : (bear / bull >= 2 ? -0.1 : 0)
  return Math.max(-1, Math.min(1, dampened + bullBonus + bearBonus))
}

function sentimentLabel(score) {
  if (score >  0.3) return 'Bullish'
  if (score < -0.3) return 'Bearish'
  return 'Neutral'
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchNewsAPI(category) {
  const res  = await fetch(
    `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=30&apiKey=${NEWSAPI_KEY}`
  )
  const data = await res.json()
  return (data.articles ?? [])
    .filter(a => a.title && !a.title.includes('[Removed]'))
    .map(a => ({
      source:   a.source?.name ?? 'NewsAPI',
      headline: a.title,
      url:      a.url,
      datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000),
    }))
}

async function fetchRSS(feed) {
  const res  = await fetch(feed.url, { headers: { 'User-Agent': 'BernsDashboard/1.0' } })
  const xml  = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return items.slice(0, 10).map(m => {
    const b       = m[1]
    const title   = b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? b.match(/<title>(.*?)<\/title>/)?.[1] ?? ''
    const link    = b.match(/<link>(.*?)<\/link>/)?.[1] ?? b.match(/<guid>(.*?)<\/guid>/)?.[1] ?? ''
    const pubDate = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    return {
      source:   feed.name,
      headline: title.trim(),
      url:      link.trim(),
      datetime: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000),
    }
  }).filter(a => a.headline)
}

async function fetchFinnhubNews() {
  const cats    = ['general', 'forex', 'merger']
  const batches = await Promise.allSettled(
    cats.map(cat => fetch(`https://finnhub.io/api/v1/news?category=${cat}&token=${FINNHUB_KEY}`).then(r => r.json()).catch(() => []))
  )
  const all  = batches.flatMap(b => b.status === 'fulfilled' ? b.value : [])
  const seen = new Set()
  return all
    .filter(h => h.headline && !seen.has(h.headline) && seen.add(h.headline))
    .map(h => ({ source: h.source || 'Finnhub', headline: h.headline, url: h.url, datetime: h.datetime }))
    .slice(0, 20)
}

async function fetchTickerNews(ticker) {
  const to   = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const res  = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`)
  const data = await res.json()
  return Array.isArray(data) ? data.slice(0, 8) : []
}

async function fetchFred(seriesId) {
  const res  = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=2`)
  const data = await res.json()
  const obs  = (data.observations ?? []).filter(o => o.value !== '.')
  if (obs.length < 1) return null
  return { value: parseFloat(obs[0].value), prev: obs.length > 1 ? parseFloat(obs[1].value) : null }
}

async function fetchMacro() {
  const results = await Promise.allSettled(FRED_SERIES.map(s => fetchFred(s.id)))
  return FRED_SERIES.map((s, i) => {
    if (results[i].status !== 'fulfilled' || !results[i].value) return null
    const { value, prev } = results[i].value
    return { id: s.id, label: s.label, value, change: prev != null ? +(value - prev).toFixed(4) : 0 }
  }).filter(Boolean)
}

function dedup(headlines) {
  const seen = new Set()
  return headlines.filter(h => h.headline && !seen.has(h.headline) && seen.add(h.headline))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[NewsAgent] starting...')

  // Fetch all sources in parallel
  const sectorEntries = Object.entries(SECTORS)
  const [
    businessRes, worldRes, techRes,
    finnhubRes, macroRes,
    ...rest
  ] = await Promise.allSettled([
    fetchNewsAPI('business'),
    fetchNewsAPI('general'),
    fetchNewsAPI('technology'),
    fetchFinnhubNews(),
    fetchMacro(),
    ...RSS_FEEDS.map(f => fetchRSS(f)),
    ...sectorEntries.map(([, etf]) => fetchTickerNews(etf)),
  ])

  const rssOffset    = 0
  const sectorOffset = RSS_FEEDS.length
  const rssResults   = rest.slice(rssOffset, rssOffset + RSS_FEEDS.length)
  const sectorResults = rest.slice(sectorOffset)

  const businessHeadlines = businessRes.status === 'fulfilled' ? businessRes.value : []
  const worldHeadlines    = worldRes.status    === 'fulfilled' ? worldRes.value    : []
  const techHeadlines     = techRes.status     === 'fulfilled' ? techRes.value     : []
  const finnhubHeadlines  = finnhubRes.status  === 'fulfilled' ? finnhubRes.value  : []
  const rssHeadlines      = rssResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])
  const macro             = macroRes.status    === 'fulfilled' ? macroRes.value    : []

  const sectorNews = {}
  sectorEntries.forEach(([sector], i) => {
    sectorNews[sector] = sectorResults[i]?.status === 'fulfilled' ? sectorResults[i].value : []
  })

  // Build categorized headline sets
  const marketsRaw = dedup([...businessHeadlines, ...rssHeadlines, ...finnhubHeadlines])
    .sort((a, b) => b.datetime - a.datetime).slice(0, 25)
  const worldRaw   = dedup(worldHeadlines)
    .sort((a, b) => b.datetime - a.datetime).slice(0, 25)
  const techRaw    = dedup(techHeadlines)
    .sort((a, b) => b.datetime - a.datetime).slice(0, 20)

  console.log(`[NewsAgent] markets: ${marketsRaw.length}, world: ${worldRaw.length}, tech: ${techRaw.length}`)
  console.log('[NewsAgent] scoring with Groq...')

  // Score all groups in parallel
  const [mScoresRes, wScoresRes, tScoresRes, ...sectorScoreResults] = await Promise.allSettled([
    scoreHeadlines(marketsRaw.map(h => h.headline)),
    scoreHeadlines(worldRaw.map(h => h.headline)),
    scoreHeadlines(techRaw.map(h => h.headline)),
    ...sectorEntries.map(([sector]) => scoreHeadlines(sectorNews[sector].map(h => h.headline))),
  ])

  const mScores = mScoresRes.status === 'fulfilled' ? mScoresRes.value : []
  const wScores = wScoresRes.status === 'fulfilled' ? wScoresRes.value : []
  const tScores = tScoresRes.status === 'fulfilled' ? tScoresRes.value : []

  const sectorScores = {}
  sectorEntries.forEach(([sector], i) => {
    sectorScores[sector] = sectorScoreResults[i]?.status === 'fulfilled' ? sectorScoreResults[i].value : []
  })

  const now = Math.floor(Date.now() / 1000)

  function annotate(headlines, scores) {
    return headlines.map((h, i) => {
      const score     = scores[i] ?? 0
      const ageMin    = Math.floor((now - h.datetime) / 60)
      const breaking  = ageMin < 45
      const highImpact = Math.abs(score) >= 0.6
      return { ...h, sentiment: +score.toFixed(3), breaking, highImpact }
    })
  }

  const marketsScored = annotate(marketsRaw, mScores)
  const worldScored   = annotate(worldRaw,   wScores)
  const techScored    = annotate(techRaw,    tScores)

  // Overall market sentiment = conviction score across all markets headlines
  const marketScore = convictionScore(mScores)
  const worldScore  = convictionScore(wScores)

  // Sector sentiment
  const sectors = {}
  for (const [sector] of sectorEntries) {
    const scores = sectorScores[sector] ?? []
    const score  = convictionScore(scores)
    sectors[sector] = {
      etf:             SECTORS[sector],
      convictionScore: +score.toFixed(3),
      label:           sentimentLabel(score),
      articles:        sectorNews[sector].length,
    }
  }

  const payload = {
    updated_at:       new Date().toISOString(),
    market_sentiment: { score: +marketScore.toFixed(3), label: sentimentLabel(marketScore) },
    world_sentiment:  { score: +worldScore.toFixed(3),  label: sentimentLabel(worldScore)  },
    headlines: {
      markets: marketsScored,
      world:   worldScored,
      tech:    techScored,
    },
    sectors,
    macro,
  }

  console.log(`[NewsAgent] markets: ${marketScore.toFixed(3)} (${sentimentLabel(marketScore)}), world: ${worldScore.toFixed(3)} (${sentimentLabel(worldScore)})`)
  console.log(`[NewsAgent] sectors: ${Object.entries(sectors).map(([s, d]) => `${s}=${d.label}`).join(', ')}`)

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news', data: payload }),
  })

  const result = await res.json()
  console.log('[NewsAgent] ingest:', result)
}

run().catch(err => {
  console.error('[NewsAgent] fatal:', err)
  process.exit(1)
})
