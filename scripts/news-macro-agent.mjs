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
const FRED_KEY    = env.FRED_API_KEY
const BLS_KEY     = env.BLS_KEY
const BEA_KEY     = env.BEA_KEY
const EIA_KEY     = env.EIA_KEY
const GROQ_KEY    = env.GROQ_KEY || env.GROQ_API_KEY
const INGEST_URL  = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET = env.CRON_SECRET
const DB_URL      = env.DATABASE_URL

// ── FRED series ───────────────────────────────────────────────────────────────

const RATE_SERIES = [
  { id: 'FEDFUNDS',     key: 'fed_funds', label: 'Fed Funds Rate'   },
  { id: 'DGS10',        key: 'dgs10',     label: '10Y Treasury'     },
  { id: 'DGS2',         key: 'dgs2',      label: '2Y Treasury'      },
  { id: 'T10Y2Y',       key: 't10y2y',    label: '10Y–2Y Spread'    },
  { id: 'BAMLH0A0HYM2', key: 'hy_spread', label: 'HY Credit Spread' },
]

const OTHER_SERIES = [
  { id: 'CPIAUCSL', key: 'cpi', label: 'CPI YoY'          },
  { id: 'PCEPI',    key: 'pce', label: 'PCE (Consumer)'   },
  { id: 'UNRATE',   key: 'unemployment', label: 'Unemployment Rate' },
  { id: 'GDPC1',    key: 'gdp', label: 'Real GDP (QoQ)'   },
]

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fredCurrent(seriesId) {
  const res  = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=2`)
  const data = await res.json()
  const obs  = (data.observations ?? []).filter(o => o.value !== '.')
  if (!obs.length) return null
  return { value: parseFloat(obs[0].value), prev: obs[1] ? parseFloat(obs[1].value) : null, date: obs[0].date }
}

async function fredHistory(seriesId, days = 120) {
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const res   = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&observation_start=${start}&sort_order=asc`)
  const data  = await res.json()
  return (data.observations ?? [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
}

async function fetchBLS() {
  try {
    const res  = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid:        ['CES0000000001', 'LNS14000000'],
        startyear:       String(new Date().getFullYear() - 1),
        endyear:         String(new Date().getFullYear()),
        registrationkey: BLS_KEY,
      }),
    })
    const data = await res.json()
    const series = data.Results?.series ?? []
    const nfp  = series.find(s => s.seriesID === 'CES0000000001')
    const unem = series.find(s => s.seriesID === 'LNS14000000')
    const latestNFP  = nfp?.data?.[0]
    const latestUnem = unem?.data?.[0]
    return {
      nonfarm_payrolls:  latestNFP  ? parseInt(latestNFP.value.replace(',', '')) * 1000 : null,
      unemployment_rate: latestUnem ? parseFloat(latestUnem.value) : null,
      period: latestNFP ? `${latestNFP.periodName} ${latestNFP.year}` : null,
      source: 'BLS',
    }
  } catch {
    // FRED fallback
    const [payrolls, unem] = await Promise.allSettled([
      fredCurrent('PAYEMS'),
      fredCurrent('UNRATE'),
    ])
    return {
      nonfarm_payrolls:  payrolls.status === 'fulfilled' && payrolls.value ? payrolls.value.value * 1000 : null,
      unemployment_rate: unem.status     === 'fulfilled' && unem.value     ? unem.value.value     : null,
      period: payrolls.status === 'fulfilled' && payrolls.value ? payrolls.value.date : null,
      source: 'FRED fallback',
    }
  }
}

async function fetchBEA() {
  try {
    const year = new Date().getFullYear()
    const res  = await fetch(`https://apps.bea.gov/api/data?UserID=${BEA_KEY}&method=GetData&DataSetName=NIPA&TableName=T10101&Frequency=Q&Year=${year},${year - 1}&ResultFormat=JSON`)
    const data = await res.json()
    const rows  = data.BEAAPI?.Results?.Data ?? []
    const gdpRow = rows.find(r => r.LineDescription === 'Gross domestic product' && r.TimePeriod)
    if (gdpRow) return { value: parseFloat(gdpRow.DataValue.replace(',', '')), period: gdpRow.TimePeriod, source: 'BEA' }
    throw new Error('no BEA GDP row')
  } catch {
    const fred = await fredCurrent('GDPC1').catch(() => null)
    return fred ? { value: fred.value, period: fred.date?.slice(0, 7), source: 'FRED fallback' } : null
  }
}

async function fetchEIAInventories() {
  const series = {
    crude_inventory:   'PET.WCRSTUS1.W',
    gasoline_inventory: 'PET.WGTSTUS1.W',
  }
  const results = {}
  await Promise.allSettled(
    Object.entries(series).map(async ([key, id]) => {
      try {
        const url  = `https://api.eia.gov/v2/seriesid/${id}?api_key=${EIA_KEY}&data[]=value&sort[0][column]=period&sort[0][direction]=desc&length=2`
        const res  = await fetch(url)
        const data = await res.json()
        const pts  = data.response?.data ?? []
        if (pts.length >= 2) results[key] = { value: parseFloat(pts[0].value), change: +(parseFloat(pts[0].value) - parseFloat(pts[1].value)).toFixed(0) }
      } catch {}
    })
  )
  return results
}

async function groqAnalysis(indicators, jobs, gdp) {
  const summary = [
    `Fed Funds: ${indicators.fed_funds?.value?.toFixed(2)}%`,
    `10Y Treasury: ${indicators.dgs10?.value?.toFixed(2)}%`,
    `2Y Treasury: ${indicators.dgs2?.value?.toFixed(2)}%`,
    `10Y-2Y Spread: ${indicators.t10y2y?.value?.toFixed(2)}%`,
    `HY Spread: ${indicators.hy_spread?.value?.toFixed(2)}%`,
    `CPI: ${indicators.cpi?.value?.toFixed(2)}`,
    `PCE: ${indicators.pce?.value?.toFixed(2)}`,
    `Unemployment: ${indicators.unemployment?.value?.toFixed(1)}%`,
    jobs?.nonfarm_payrolls ? `Nonfarm Payrolls: ${(jobs.nonfarm_payrolls / 1000).toFixed(0)}K (${jobs.period})` : '',
    gdp?.value ? `GDP: ${gdp.value.toFixed(1)}% (${gdp.period})` : '',
  ].filter(Boolean).join('\n')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', max_tokens: 300, temperature: 0.3,
      messages: [
        { role: 'system', content: 'You are a macroeconomic analyst. Write a 150-word directional macro brief. Lead with a clear conviction call (HAWKISH/DOVISH/STAGFLATION/GOLDILOCKS/etc). Be quantitative. Do not hedge. Take a position on where rates, growth, and inflation are heading.' },
        { role: 'user', content: `Current macro data:\n${summary}\n\nWrite the brief.` },
      ],
    }),
  })
  return (await res.json()).choices?.[0]?.message?.content ?? ''
}

async function saveHistory(indicators) {
  const pool = new pg.Pool({ connectionString: DB_URL })
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news_macro_history (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        fed_funds FLOAT, dgs10 FLOAT, dgs2 FLOAT, t10y2y FLOAT, hy_spread FLOAT, cpi FLOAT, pce FLOAT,
        UNIQUE(date)
      )
    `)
    await pool.query(`
      INSERT INTO news_macro_history (date, fed_funds, dgs10, dgs2, t10y2y, hy_spread, cpi, pce)
      VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (date) DO UPDATE SET
        fed_funds=$1, dgs10=$2, dgs2=$3, t10y2y=$4, hy_spread=$5, cpi=$6, pce=$7
    `, [
      indicators.fed_funds?.value ?? null,
      indicators.dgs10?.value     ?? null,
      indicators.dgs2?.value      ?? null,
      indicators.t10y2y?.value    ?? null,
      indicators.hy_spread?.value ?? null,
      indicators.cpi?.value       ?? null,
      indicators.pce?.value       ?? null,
    ])

    // Return 120 days of history
    const rows = await pool.query(`SELECT * FROM news_macro_history ORDER BY date ASC`)
    return rows.rows.map(r => ({
      date:      r.date.toISOString().slice(0, 10),
      fed_funds: r.fed_funds, dgs10: r.dgs10, dgs2: r.dgs2,
      t10y2y:    r.t10y2y,    hy_spread: r.hy_spread, cpi: r.cpi, pce: r.pce,
    }))
  } finally {
    await pool.end()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('[MacroAgent] starting...')

  // Fetch all current values
  const allSeries = [...RATE_SERIES, ...OTHER_SERIES]
  const currentResults = await Promise.allSettled(allSeries.map(s => fredCurrent(s.id)))

  const indicators = {}
  allSeries.forEach((s, i) => {
    if (currentResults[i].status === 'fulfilled' && currentResults[i].value) {
      const { value, prev, date } = currentResults[i].value
      indicators[s.key] = { value, prev, change: prev != null ? +(value - prev).toFixed(4) : 0, date, label: s.label }
    }
  })

  // Fetch 120-day history for rates, CPI, PCE in parallel
  const [ratesHistRes, cpiHistRes, pceHistRes, jobsRes, gdpRes, eiaRes] = await Promise.allSettled([
    Promise.all(RATE_SERIES.map(s => fredHistory(s.id, 120).then(h => ({ key: s.key, data: h })))),
    fredHistory('CPIAUCSL', 120),
    fredHistory('PCEPI', 120),
    fetchBLS(),
    fetchBEA(),
    fetchEIAInventories(),
  ])

  // Build rates history as array of objects keyed by date
  let ratesHistory = []
  if (ratesHistRes.status === 'fulfilled') {
    const seriesData = ratesHistRes.value
    const dateMap = {}
    for (const { key, data } of seriesData) {
      for (const { date, value } of data) {
        if (!dateMap[date]) dateMap[date] = { date }
        dateMap[date][key] = value
      }
    }
    ratesHistory = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
  }

  const cpiHistory  = cpiHistRes.status  === 'fulfilled' ? cpiHistRes.value  : []
  const pceHistory  = pceHistRes.status  === 'fulfilled' ? pceHistRes.value  : []
  const jobs        = jobsRes.status     === 'fulfilled' ? jobsRes.value     : null
  const gdp         = gdpRes.status      === 'fulfilled' ? gdpRes.value      : null
  const inventories = eiaRes.status      === 'fulfilled' ? eiaRes.value      : {}

  console.log(`[MacroAgent] indicators: ${Object.keys(indicators).join(', ')}`)
  console.log(`[MacroAgent] history: rates=${ratesHistory.length}pts, cpi=${cpiHistory.length}pts, pce=${pceHistory.length}pts`)

  const [analysis, dbHistory] = await Promise.allSettled([
    groqAnalysis(indicators, jobs, gdp),
    saveHistory(indicators),
  ])

  const payload = {
    updated_at:   new Date().toISOString(),
    indicators,
    history: {
      rates:  ratesHistory,
      cpi:    cpiHistory,
      pce:    pceHistory,
      db:     dbHistory.status === 'fulfilled' ? dbHistory.value : [],
    },
    jobs,
    gdp,
    inventories,
    analysis: analysis.status === 'fulfilled' ? analysis.value : '',
  }

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ agent: 'news-macro', data: payload }),
  })
  console.log('[MacroAgent] ingest:', await res.json())
}

run().catch(err => { console.error('[MacroAgent] fatal:', err); process.exit(1) })
