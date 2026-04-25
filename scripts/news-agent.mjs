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

const env          = loadEnv(ENV_PATH)
const FINNHUB_KEY  = env.FINNHUB_API_KEY
const FRED_KEY     = env.FRED_API_KEY
const GROQ_KEY     = env.GROQ_API_KEY
const NEWSAPI_KEY  = env.NEWSAPI_KEY
const INGEST_URL   = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET  = env.CRON_SECRET

// ── Sectors (ETF proxies for sentiment) ───────────────────────────────────────

const SECTORS = {
  Technology:            'XLK',
  Energy:                'XLE',
  Financials:            'XLF',
  Healthcare:            'XLV',
  'Consumer Discretionary': 'XLY',
  'Consumer Staples':    'XLP',
  Industrials:           'XLI',
  'Fixed Income':        'TLT',
}

// ── FRED macro series ─────────────────────────────────────────────────────────

const FRED_SERIES = [
  { id: 'FEDFUNDS', label: 'Fed Funds Rate' },
  { id: 'DGS10',    label: '10Y Treasury'   },
  { id: 'T10Y2Y',   label: '10Y–2Y Spread'  },
  { id: 'CPIAUCSL', label: 'CPI'            },
]

// ── RSS feeds (no key needed) ─────────────────────────────────────────────────

const RSS_FEEDS = [
  { name: 'Reuters',  url: 'https://feeds.reuters.com/reuters/businessNews'             },
  { name: 'WSJ',      url: 'https://feeds.content.dowjones.io/public/rss/moneymktg'    },
  { name: 'FT',       url: 'https://www.ft.com/rss/home'                               },
]

// ── Sentiment engine ──────────────────────────────────────────────────────────

async function scoreHeadlines(headlines) {
  if (headlines.length === 0) return []

  const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  512,
      temperature: 0,
      messages: [
        {
          role:    'system',
          content: 'You are a financial sentiment scorer. Score each headline -1.0 (very bearish) to +1.0 (very bullish), 0.0 neutral. Return ONLY a JSON array of numbers in order. No explanation.',
        },
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
  } catch {
    return []
  }
}

function convictionScore(scores) {
  if (scores.length === 0) return 0
  const avg      = scores.reduce((s, x) => s + x, 0) / scores.length
  const dampened = avg * 0.8
  const bull     = scores.filter(s => s >  0.1).length
  const bear     = scores.filter(s => s < -0.1).length
  const bullBonus = bear === 0 ? (bull >= 2 ? 0.1 : 0) : (bull / bear >= 2 ? 0.1 : 0)
  const bearBonus = bull === 0 ? (bear >= 2 ? -0.1 : 0) : (bear / bull >= 2 ? -0.1 : 0)
  return Math.max(-1, Math.min(1, dampened + bullBonus + bearBonus))
}

function sentimentLabel(score) {
  if (score >  0.3) return 'Bullish'
  if (score < -0.3) return 'Bearish'
  return 'Neutral'
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchNewsAPI() {
  const res  = await fetch(
    `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=30&apiKey=${NEWSAPI_KEY}`
  )
  const data = await res.json()
  return (data.articles ?? []).map(a => ({
    source:   a.source?.name ?? 'NewsAPI',
    headline: a.title,
    url:      a.url,
    datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000),
  })).filter(a => a.headline && !a.headline.includes('[Removed]'))
}

async function fetchRSS(feed) {
  const res  = await fetch(feed.url, { headers: { 'User-Agent': 'BernsDashboard/1.0' } })
  const xml  = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return items.slice(0, 10).map(m => {
    const block    = m[1]
    const title    = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
                  ?? block.match(/<title>(.*?)<\/title>/)?.[1]
                  ?? ''
    const link     = block.match(/<link>(.*?)<\/link>/)?.[1]
                  ?? block.match(/<guid>(.*?)<\/guid>/)?.[1]
                  ?? ''
    const pubDate  = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    const datetime = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000)
    return { source: feed.name, headline: title.trim(), url: link.trim(), datetime }
  }).filter(a => a.headline)
}

async function fetchFinnhubNews() {
  const cats = ['general', 'forex', 'merger']
  const batches = await Promise.allSettled(
    cats.map(cat =>
      fetch(`https://finnhub.io/api/v1/news?category=${cat}&token=${FINNHUB_KEY}`)
        .then(r => r.json()).catch(() => [])
    )
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
  const res  = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
  )
  const data = await res.json()
  return Array.isArray(data) ? data.slice(0, 8) : []
}

async function fetchFred(seriesId) {
  const res  = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=2`
  )
  const data = await res.json()
  const obs  = (data.observations ?? []).filter(o => o.value !== '.')
  if (obs.length < 1) return null
  return {
    value: parseFloat(obs[0].value),
    prev:  obs.length > 1 ? parseFloat(obs[1].value) : null,
  }
}

async function fetchMacro() {
  const results = await Promise.allSettled(FRED_SERIES.map(s => fetchFred(s.id)))
  return FRED_SERIES.map((s, i) => {
    if (results[i].status !== 'fulfilled' || !results[i].value) return null
    const { value, prev } = results[i].value
    return { id: s.id, label: s.label, value, change: prev != null ? +(value - prev).toFixed(4) : 0 }
  }).filter(Boolean)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[NewsAgent] starting...')

  // Fetch all news sources in parallel
  const [newsAPIRes, finnhubRes, ...rssResults] = await Promise.allSettled([
    fetchNewsAPI(),
    fetchFinnhubNews(),
    ...RSS_FEEDS.map(f => fetchRSS(f)),
  ])

  const newsAPIHeadlines  = newsAPIRes.status  === 'fulfilled' ? newsAPIRes.value  : []
  const finnhubHeadlines  = finnhubRes.status  === 'fulfilled' ? finnhubRes.value  : []
  const rssHeadlines      = rssResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  console.log(`[NewsAgent] NewsAPI: ${newsAPIHeadlines.length}, Finnhub: ${finnhubHeadlines.length}, RSS: ${rssHeadlines.length}`)

  // Merge + deduplicate all headlines, newest first
  const seen = new Set()
  const allHeadlines = [...newsAPIHeadlines, ...rssHeadlines, ...finnhubHeadlines]
    .filter(h => h.headline && !seen.has(h.headline) && seen.add(h.headline))
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 40)

  // Fetch sector ETF news + macro in parallel
  const sectorEntries = Object.entries(SECTORS)
  const [macroRes, ...sectorNewsResults] = await Promise.allSettled([
    fetchMacro(),
    ...sectorEntries.map(([, etf]) => fetchTickerNews(etf)),
  ])

  const macro      = macroRes.status === 'fulfilled' ? macroRes.value : []
  const sectorNews = {}
  sectorEntries.forEach(([sector], i) => {
    sectorNews[sector] = sectorNewsResults[i].status === 'fulfilled' ? sectorNewsResults[i].value : []
  })

  console.log('[NewsAgent] scoring headlines with Groq...')

  // Score all groups in parallel
  const top20 = allHeadlines.slice(0, 20)
  const [marketScoresRes, ...sectorScoreResults] = await Promise.allSettled([
    scoreHeadlines(top20.map(h => h.headline)),
    ...sectorEntries.map(([sector]) =>
      scoreHeadlines(sectorNews[sector].map(h => h.headline))
    ),
  ])

  const marketScores = marketScoresRes.status === 'fulfilled' ? marketScoresRes.value : []
  const sectorScores = {}
  sectorEntries.forEach(([sector], i) => {
    sectorScores[sector] = sectorScoreResults[i].status === 'fulfilled' ? sectorScoreResults[i].value : []
  })

  // Build market sentiment
  const marketScore = convictionScore(marketScores)

  // Annotate top headlines with sentiment score
  const scoredHeadlines = top20.map((h, i) => ({
    ...h,
    sentiment: marketScores[i] ?? 0,
  }))

  // Build sector sentiment
  const sectors = {}
  for (const [sector, { }] of sectorEntries) {
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
    headlines:        scoredHeadlines,
    sectors,
    macro,
  }

  console.log(`[NewsAgent] market: ${marketScore.toFixed(3)} (${payload.market_sentiment.label})`)
  console.log(`[NewsAgent] sectors: ${Object.entries(sectors).map(([s, d]) => `${s}=${d.label}`).join(', ')}`)
  console.log(`[NewsAgent] headlines: ${scoredHeadlines.length} scored`)

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ agent: 'news', data: payload }),
  })

  const result = await res.json()
  console.log('[NewsAgent] ingest:', result)
}

run().catch(err => {
  console.error('[NewsAgent] fatal:', err)
  process.exit(1)
})
