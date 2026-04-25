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

const env          = loadEnv(ENV_PATH)
const NEWSAPI_KEY  = env.NEWSAPI_KEY
const FINNHUB_KEY  = env.FINNHUB_API_KEY
const GROQ_KEY     = env.GROQ_KEY || env.GROQ_API_KEY
const GROQ_KEY_2   = env.GROQ_KEY_2
const EIA_KEY      = env.EIA_KEY
const INGEST_URL   = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET  = env.CRON_SECRET

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

const RSS_MARKETS = [
  { name: 'Reuters',  url: 'https://feeds.reuters.com/reuters/businessNews'          },
  { name: 'WSJ',      url: 'https://feeds.content.dowjones.io/public/rss/moneymktg' },
  { name: 'FT',       url: 'https://www.ft.com/rss/home'                            },
]

// ── Sentiment ─────────────────────────────────────────────────────────────────

async function groqCall(key, messages, max_tokens) {
  const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens, temperature: 0, messages }),
  })
  const json = await res.json()
  if (!res.ok || json.error) console.error('[MarketsAgent] Groq error:', JSON.stringify(json).slice(0, 200))
  return json.choices?.[0]?.message?.content ?? ''
}

async function groq(messages, max_tokens = 512) {
  const result = await groqCall(GROQ_KEY, messages, max_tokens)
  if (!result && GROQ_KEY_2) {
    console.log('[MarketsAgent] primary key empty, retrying with key 2')
    return groqCall(GROQ_KEY_2, messages, max_tokens)
  }
  return result
}

async function scoreHeadlines(headlines) {
  if (!headlines.length) return []
  const numbered = headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')
  const text = await groq([
    { role: 'system', content: 'Score each financial/market headline -1.0 (very bearish) to +1.0 (very bullish), 0.0 neutral. Consider market impact, earnings, Fed policy, economic data. Return ONLY a JSON array of numbers.' },
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
    { role: 'system', content: 'Rank market headlines by importance: (1) recency <120min, (2) |score|>0.4, (3) source credibility Reuters/WSJ/FT > others. Return ONLY a JSON array of 10 indices. Example: [3,0,7,2,9,1,5,8,4,6]' },
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

async function writeSummary(conviction, sectors, headlines) {
  const sectorLines = Object.entries(sectors)
    .map(([name, d]) => `${name}: ${d.label} (${d.convictionScore.toFixed(2)}, ${d.articles} articles)`)
    .join('\n')
  const topLines = headlines.slice(0, 8).map(h => `- ${h.headline} (${h.source}, score=${h.sentiment})`).join('\n')
  const text = await groq([
    { role: 'system', content: 'You are a sell-side equity strategist writing for a sophisticated PM. Return ONLY valid JSON with this exact structure:\n{"summary":"3-4 sentences. Name specific indices, spread levels, or rate moves. Explain the mechanism — not just what happened, but why it matters and what it implies for the next 48h. No generic statements.","outlook":"Bullish/Bearish/Neutral/Stagflation — one sentence naming the specific catalyst or data point driving the view, not just the label","tailwinds":["specific tailwind with data, company, or causal mechanism — never a generic phrase","tailwind 2","tailwind 3"],"headwinds":["specific risk with data or mechanism","risk 2","risk 3"],"sectors":{"SectorName":{"catalyst":"specific catalyst with data","risk":"specific risk with data"}}}\nInclude all sectors given. Every bullet must contain a specific number, company, or causal link. No markdown, no extra text, no explanation.' },
    { role: 'user', content: `Market conviction: ${conviction.toFixed(2)}\n\nSector scores:\n${sectorLines}\n\nTop headlines:\n${topLines}` },
  ], 900)
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchNewsAPI() {
  const res  = await fetch(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=30&apiKey=${NEWSAPI_KEY}`)
  const data = await res.json()
  return (data.articles ?? [])
    .filter(a => a.title && !a.title.includes('[Removed]'))
    .map(a => ({ source: a.source?.name ?? 'NewsAPI', headline: a.title, url: a.url, datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000) }))
}

async function fetchRSS(feed) {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'BernsDashboard/1.0' } })
  const xml = await res.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(m => {
    const b     = m[1]
    const title = b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? b.match(/<title>(.*?)<\/title>/)?.[1] ?? ''
    const link  = b.match(/<link>(.*?)<\/link>/)?.[1] ?? b.match(/<guid>(.*?)<\/guid>/)?.[1] ?? ''
    const pub   = b.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
    return { source: feed.name, headline: title.trim(), url: link.trim(), datetime: pub ? Math.floor(new Date(pub).getTime() / 1000) : Math.floor(Date.now() / 1000) }
  }).filter(a => a.headline)
}

async function fetchFinnhubNews() {
  const cats    = ['general', 'forex', 'merger']
  const results = await Promise.allSettled(cats.map(cat =>
    fetch(`https://finnhub.io/api/v1/news?category=${cat}&token=${FINNHUB_KEY}`).then(r => r.json()).catch(() => [])
  ))
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .map(h => ({ source: h.source || 'Finnhub', headline: h.headline, url: h.url, datetime: h.datetime }))
}

async function fetchTickerNews(ticker) {
  const to   = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
  const res  = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${FINNHUB_KEY}`)
  const data = await res.json()
  return Array.isArray(data) ? data.slice(0, 5).map(h => ({ source: h.source || 'Finnhub', headline: h.headline, url: h.url, datetime: h.datetime })) : []
}

async function fetchEIAPrices() {
  const series = { wti: 'PET.RWTC.D', brent: 'PET.RBRTE.D', nat_gas: 'NG.RNGWHHD.D' }
  const results = {}
  await Promise.allSettled(
    Object.entries(series).map(async ([key, id]) => {
      try {
        const url  = `https://api.eia.gov/v2/seriesid/${id}?api_key=${EIA_KEY}&data[]=value&sort[0][column]=period&sort[0][direction]=desc&length=5`
        const res  = await fetch(url)
        const data = await res.json()
        const pts  = (data.response?.data ?? []).filter(p => p.value != null && p.value !== '')
        if (pts.length >= 2) {
          const v = parseFloat(pts[0].value), p = parseFloat(pts[1].value)
          results[key] = { value: v, prev: p, change: +(v - p).toFixed(2) }
        }
      } catch {}
    })
  )
  return results
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[MarketsAgent] starting...')

  const sectorEntries = Object.entries(SECTORS)

  const [newsAPIRes, finnhubRes, energyRes, ...rest] = await Promise.allSettled([
    fetchNewsAPI(),
    fetchFinnhubNews(),
    fetchEIAPrices(),
    ...RSS_MARKETS.map(f => fetchRSS(f)),
    ...sectorEntries.map(([, etf]) => fetchTickerNews(etf)),
  ])

  const rssOffset     = 0
  const sectorOffset  = RSS_MARKETS.length
  const rssResults    = rest.slice(rssOffset, rssOffset + RSS_MARKETS.length)
  const sectorResults = rest.slice(sectorOffset)

  const newsAPI  = newsAPIRes.status  === 'fulfilled' ? newsAPIRes.value  : []
  const finnhub  = finnhubRes.status  === 'fulfilled' ? finnhubRes.value  : []
  const energy   = energyRes.status   === 'fulfilled' ? energyRes.value   : {}
  const rss      = rssResults.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  const sectorNews = {}
  sectorEntries.forEach(([sector], i) => {
    sectorNews[sector] = sectorResults[i]?.status === 'fulfilled' ? sectorResults[i].value : []
  })

  const seen = new Set()
  const all  = [...newsAPI, ...rss, ...finnhub]
    .filter(h => h.headline && !seen.has(h.headline) && seen.add(h.headline))
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 30)

  console.log(`[MarketsAgent] ${all.length} headlines, scoring...`)

  // Score main headlines + sector news in parallel
  const [mainScoresRes, ...sectorScoreResults] = await Promise.allSettled([
    scoreHeadlines(all.map(h => h.headline)),
    ...sectorEntries.map(([sector]) => scoreHeadlines(sectorNews[sector].map(h => h.headline))),
  ])

  const mainScores   = mainScoresRes.status === 'fulfilled' ? mainScoresRes.value : []
  const sectorScores = {}
  sectorEntries.forEach(([sector], i) => {
    sectorScores[sector] = sectorScoreResults[i]?.status === 'fulfilled' ? sectorScoreResults[i].value : []
  })

  const now    = Math.floor(Date.now() / 1000)
  const scored = all.map((h, i) => ({
    ...h,
    sentiment:  +(mainScores[i] ?? 0).toFixed(3),
    breaking:   (now - h.datetime) < 2700,
    highImpact: Math.abs(mainScores[i] ?? 0) >= 0.6,
  }))

  const conviction = convictionScore(mainScores)

  const sectors = {}
  for (const [sector] of sectorEntries) {
    const scores = sectorScores[sector] ?? []
    const score  = convictionScore(scores)
    sectors[sector] = { etf: SECTORS[sector], convictionScore: +score.toFixed(3), label: label(score), articles: sectorNews[sector].length }
  }

  const [top10Res, summaryRes] = await Promise.allSettled([
    rankTop10(scored).catch(() => scored.slice(0, 10)),
    writeSummary(conviction, sectors, scored),
  ])

  const top10   = top10Res.status   === 'fulfilled' ? top10Res.value   : scored.slice(0, 10)
  const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null

  if (summary?.sectors) {
    for (const [sector] of sectorEntries) {
      if (summary.sectors[sector]) {
        sectors[sector].catalyst = summary.sectors[sector].catalyst ?? null
        sectors[sector].risk     = summary.sectors[sector].risk     ?? null
      }
    }
  }

  const payload = {
    updated_at:       new Date().toISOString(),
    market_sentiment: { score: +conviction.toFixed(3), label: label(conviction) },
    headlines:        scored,
    top10,
    sectors,
    energy,
    summary: summary ? { summary: summary.summary, outlook: summary.outlook, tailwinds: summary.tailwinds, headwinds: summary.headwinds } : null,
  }

  console.log(`[MarketsAgent] conviction=${conviction.toFixed(3)} (${label(conviction)}), energy=${JSON.stringify(energy).slice(0, 80)}`)

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news-markets', data: payload }),
  })
  console.log('[MarketsAgent] ingest:', await res.json())
}

run().catch(err => { console.error('[MarketsAgent] fatal:', err); process.exit(1) })
