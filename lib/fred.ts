// FRED API client — Federal Reserve Economic Data
// Docs: https://fred.stlouisfed.org/docs/api/fred/

const FRED_BASE = 'https://api.stlouisfed.org/fred'
const KEY = process.env.FRED_API_KEY

if (!KEY) {
  console.warn('[FRED] No API key found. Set FRED_API_KEY in .env.local')
}

export interface FredObservation {
  date: string
  value: string
}

export interface FredSeriesMeta {
  id: string
  title: string
  units: string
  frequency: string
  last_updated: string
  notes?: string
}

/**
 * Fetch the latest N observations for a FRED series.
 * Common series IDs:
 *   CPIAUCSL  - CPI All Urban
 *   UNRATE    - Unemployment Rate
 *   FEDFUNDS  - Federal Funds Rate
 *   GDP       - Nominal GDP
 *   DGS10     - 10Y Treasury Yield
 *   DGS2      - 2Y Treasury Yield
 *   T10Y2Y    - 10Y-2Y Spread (recession indicator)
 *   M2SL      - M2 Money Supply
 *   VIXCLS    - VIX
 */
export async function fetchSeries(
  seriesId: string,
  limit = 12
): Promise<FredObservation[]> {
  const url = `${FRED_BASE}/series/observations?series_id=${seriesId}&api_key=${KEY}&file_type=json&sort_order=desc&limit=${limit}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`FRED ${seriesId} failed: ${res.status}`)
  const data = await res.json()
  return data.observations as FredObservation[]
}

/**
 * Fetch series metadata.
 */
export async function fetchSeriesMeta(seriesId: string): Promise<FredSeriesMeta> {
  const url = `${FRED_BASE}/series?series_id=${seriesId}&api_key=${KEY}&file_type=json`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`FRED meta ${seriesId} failed: ${res.status}`)
  const data = await res.json()
  return data.seriess[0] as FredSeriesMeta
}

/**
 * Get the latest value + previous value for delta computation.
 */
export async function fetchLatest(seriesId: string): Promise<{
  latest: FredObservation
  previous: FredObservation
  change: number
  pctChange: number
}> {
  const obs = await fetchSeries(seriesId, 2)
  const latest = obs[0]
  const previous = obs[1]
  const lv = parseFloat(latest.value)
  const pv = parseFloat(previous.value)
  return {
    latest,
    previous,
    change: lv - pv,
    pctChange: ((lv - pv) / pv) * 100,
  }
}
