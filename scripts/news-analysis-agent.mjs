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
const GROQ_KEY    = env.GROQ_KEY || env.GROQ_API_KEY
const INGEST_URL  = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET = env.CRON_SECRET
const DB_URL      = env.DATABASE_URL

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getSnapshot(agent) {
  const pool = new pg.Pool({ connectionString: DB_URL })
  try {
    const res = await pool.query('SELECT data FROM agent_snapshots WHERE agent = $1', [agent])
    return res.rows[0]?.data ?? null
  } finally {
    await pool.end()
  }
}

async function saveSentimentHistory(markets, world, tech, global_score) {
  const pool = new pg.Pool({ connectionString: DB_URL })
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news_sentiment_history (
        id SERIAL PRIMARY KEY,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        markets_score FLOAT, world_score FLOAT, tech_score FLOAT, global_score FLOAT
      )
    `)
    await pool.query(
      `INSERT INTO news_sentiment_history (markets_score, world_score, tech_score, global_score) VALUES ($1, $2, $3, $4)`,
      [markets, world, tech, global_score]
    )
    const rows = await pool.query(`SELECT * FROM news_sentiment_history ORDER BY recorded_at DESC LIMIT 840`)
    return rows.rows.map(r => ({
      date:         r.recorded_at.toISOString(),
      markets:      r.markets_score,
      world:        r.world_score,
      tech:         r.tech_score,
      global:       r.global_score,
    })).reverse()
  } finally {
    await pool.end()
  }
}

// ── Sentiment ─────────────────────────────────────────────────────────────────

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

async function groq(messages, max_tokens = 512) {
  const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens, temperature: 0.3, messages }),
  })
  const json = await res.json()
  if (!res.ok || json.error) console.error('[AnalysisAgent] Groq error:', JSON.stringify(json).slice(0, 200))
  return json.choices?.[0]?.message?.content ?? ''
}

async function rankTop10(headlines) {
  if (headlines.length <= 10) return headlines
  const now  = Date.now() / 1000
  const list = headlines.map((h, i) =>
    `${i}. [${h.source}|${h.category}] "${h.headline}" | score=${h.sentiment.toFixed(2)} | age=${Math.floor((now - h.datetime) / 60)}min`
  ).join('\n')
  const text = await groq([
    { role: 'system', content: 'Rank these headlines by global importance: (1) recency <120min, (2) |score|>0.4, (3) source credibility Reuters/WSJ/FT > others, (4) macro impact > sector specific. Return ONLY a JSON array of 10 indices (0-based). Example: [3,0,7,2,9,1,5,8,4,6]' },
    { role: 'user', content: list },
  ], 128)
  try {
    const match   = text.match(/\[[\s\d,\s-]+\]/)
    const indices = match ? JSON.parse(match[0]) : []
    const result = indices.slice(0, 10).map(i => headlines[i]).filter(Boolean)
    return result.length > 0 ? result : headlines.slice(0, 10)
  } catch { return headlines.slice(0, 10) }
}

async function writeBrief(marketsData, worldData, techData, macroData, globalScore) {
  const context = [
    `Global Conviction: ${globalScore.toFixed(2)} (${label(globalScore)})`,
    marketsData?.market_sentiment ? `Markets: ${marketsData.market_sentiment.label} (${marketsData.market_sentiment.score})` : '',
    worldData?.world_sentiment    ? `World: ${worldData.world_sentiment.label} (${worldData.world_sentiment.score})`         : '',
    techData?.tech_sentiment      ? `Tech: ${techData.tech_sentiment.label} (${techData.tech_sentiment.score})`              : '',
    macroData?.indicators?.fed_funds ? `Fed Funds: ${macroData.indicators.fed_funds.value?.toFixed(2)}%`                     : '',
    macroData?.indicators?.dgs10     ? `10Y: ${macroData.indicators.dgs10.value?.toFixed(2)}%`                               : '',
    macroData?.indicators?.t10y2y    ? `10Y-2Y Spread: ${macroData.indicators.t10y2y.value?.toFixed(2)}%`                   : '',
    macroData?.indicators?.cpi       ? `CPI: ${macroData.indicators.cpi.value?.toFixed(2)}`                                  : '',
  ].filter(Boolean).join('\n')

  const topHeadlines = [
    ...(marketsData?.top10 ?? []).slice(0, 3),
    ...(worldData?.top10   ?? []).slice(0, 3),
    ...(techData?.top10    ?? []).slice(0, 2),
  ].map(h => `- "${h.headline}" (${h.source}, score=${h.sentiment})`).join('\n')

  return groq([
    { role: 'system', content: `You are a macro strategist at a hedge fund. Write a 200-word daily brief using exactly these labeled sections:

CONVICTION: [BULL/BEAR/NEUTRAL/STAGFLATION/RISK-ON/RISK-OFF] — one clause explaining the regime.
MARKET: Equity and credit dynamics with specific data — index levels, spread moves, rate implications for multiples.
MACRO: Rate/inflation/growth triangle — cite actual numbers and what they imply.
CATALYST: The single most market-moving headline from the input. Explain the second-order effect.
KEY RISK: The specific tail scenario that breaks the thesis — name the trigger and the repricing it forces.
POSITIONING: One concrete trade — instrument, direction, and what invalidates it.

Rules: No hedging. No generic phrases. Every sentence must contain a specific number, company, or causal mechanism.` },
    { role: 'user', content: `Market snapshot:\n${context}\n\nTop headlines:\n${topHeadlines}\n\nWrite the brief.` },
  ], 700)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[AnalysisAgent] starting...')

  // Read all sub-agent snapshots in parallel
  const [marketsData, worldData, techData, macroData] = await Promise.all([
    getSnapshot('news-markets'),
    getSnapshot('news-world'),
    getSnapshot('news-tech'),
    getSnapshot('news-macro'),
  ])

  console.log(`[AnalysisAgent] snapshots: markets=${!!marketsData}, world=${!!worldData}, tech=${!!techData}, macro=${!!macroData}`)

  // Extract conviction scores
  const mScore = marketsData?.market_sentiment?.score ?? 0
  const wScore = worldData?.world_sentiment?.score    ?? 0
  const tScore = techData?.tech_sentiment?.score      ?? 0

  // Global conviction = weighted average (markets 50%, world 30%, tech 20%)
  const globalScore = convictionScore([
    ...Array(5).fill(mScore),
    ...Array(3).fill(wScore),
    ...Array(2).fill(tScore),
  ])

  // Combine top headlines from all sources for global top 10
  const combined = [
    ...(marketsData?.top10 ?? []).map(h => ({ ...h, category: 'markets' })),
    ...(worldData?.top10   ?? []).map(h => ({ ...h, category: 'world'   })),
    ...(techData?.top10    ?? []).map(h => ({ ...h, category: 'tech'    })),
  ]

  const [top10, brief, sentimentHistory] = await Promise.allSettled([
    rankTop10(combined),
    writeBrief(marketsData, worldData, techData, macroData, globalScore),
    saveSentimentHistory(mScore, wScore, tScore, globalScore),
  ])

  const payload = {
    updated_at:       new Date().toISOString(),
    global_conviction: { score: +globalScore.toFixed(3), label: label(globalScore) },
    sectors: {
      markets: { score: mScore, label: label(mScore) },
      world:   { score: wScore, label: label(wScore) },
      tech:    { score: tScore, label: label(tScore) },
    },
    top10:             top10.status     === 'fulfilled' ? top10.value             : combined.slice(0, 10),
    brief:             brief.status     === 'fulfilled' ? brief.value             : (console.error('[AnalysisAgent] brief failed:', brief.reason), ''),
    sentiment_history: sentimentHistory.status === 'fulfilled' ? sentimentHistory.value : [],
  }

  console.log(`[AnalysisAgent] global=${globalScore.toFixed(3)} (${label(globalScore)}), top10=${payload.top10.length}`)
  console.log(`[AnalysisAgent] brief preview: ${payload.brief.slice(0, 100)}...`)

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news-analysis', data: payload }),
  })
  console.log('[AnalysisAgent] ingest:', await res.json())
}

run().catch(err => { console.error('[AnalysisAgent] fatal:', err); process.exit(1) })
