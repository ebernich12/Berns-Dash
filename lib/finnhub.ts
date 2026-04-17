// Finnhub API client
// Docs: https://finnhub.io/docs/api
// Free tier: 60 calls/minute

const BASE = 'https://finnhub.io/api/v1'
const KEY  = process.env.FINNHUB_API_KEY

function url(path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams({ ...params, token: KEY ?? '' })
  return `${BASE}${path}?${q}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Quote {
  c:  number  // current price
  d:  number  // change
  dp: number  // percent change
  h:  number  // day high
  l:  number  // day low
  o:  number  // open
  pc: number  // previous close
}

export interface CompanyProfile {
  name:          string
  ticker:        string
  exchange:      string
  ipo:           string
  industry:      string
  weburl:        string
  logo:          string
  marketCap:     number
  shareOutstanding: number
  currency:      string
  country:       string
}

export interface BasicFinancials {
  metric: {
    peNormalizedAnnual?: number
    pbAnnual?:           number
    psAnnual?:           number
    epsGrowth3Y?:        number
    revenueGrowth3Y?:    number
    roaRfy?:             number
    roeRfy?:             number
    debtEquityAnnual?:   number
    netMarginAnnual?:    number
    currentRatioAnnual?: number
    '52WeekHigh'?:       number
    '52WeekLow'?:        number
    '52WeekPriceReturnDaily'?: number
    beta?:               number
  }
}

export interface NewsItem {
  headline: string
  summary:  string
  source:   string
  url:      string
  datetime: number
  category: string
}

export interface Sentiment {
  buzz: {
    articlesInLastWeek: number
    buzz:               number
    weeklyAverage:      number
  }
  companyNewsScore:            number
  sectorAverageBullishPercent: number
  sectorAverageNewsScore:      number
  sentiment: {
    bearishPercent: number
    bullishPercent: number
  }
  symbol: string
}

export interface EarningsEvent {
  date:            string
  symbol:          string
  epsActual:       number | null
  epsEstimate:     number | null
  revenueActual:   number | null
  revenueEstimate: number | null
  hour:            string
  year:            number
  quarter:         number
}

export interface EconEvent {
  actual:   number | null
  country:  string
  estimate: number | null
  event:    string
  impact:   string
  prev:     number | null
  time:     string
  unit:     string
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchQuote(symbol: string): Promise<Quote> {
  const res = await fetch(url('/quote', { symbol }), { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`Quote ${symbol}: ${res.status}`)
  return res.json()
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const results = await Promise.allSettled(symbols.map(s => fetchQuote(s)))
  return Object.fromEntries(
    symbols.map((s, i) => [s, results[i].status === 'fulfilled' ? (results[i] as any).value : null])
  )
}

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  const res = await fetch(url('/stock/profile2', { symbol }), { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  return Object.keys(data).length ? data : null
}

export async function fetchBasicFinancials(symbol: string): Promise<BasicFinancials | null> {
  const res = await fetch(url('/stock/metric', { symbol, metric: 'all' }), { next: { revalidate: 3600 } })
  if (!res.ok) return null
  return res.json()
}

export async function fetchCompanyNews(symbol: string, days = 7): Promise<NewsItem[]> {
  const to   = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const res  = await fetch(url('/company-news', { symbol, from, to }), { next: { revalidate: 1800 } })
  if (!res.ok) return []
  return ((await res.json()) as NewsItem[]).slice(0, 15)
}

export async function fetchMarketNews(category = 'general'): Promise<NewsItem[]> {
  const res = await fetch(url('/news', { category }), { next: { revalidate: 1800 } })
  if (!res.ok) return []
  return ((await res.json()) as NewsItem[]).slice(0, 30)
}

export async function fetchSentiment(symbol: string): Promise<Sentiment> {
  const res = await fetch(url('/news-sentiment', { symbol }), { next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Sentiment ${symbol}: ${res.status}`)
  return res.json()
}

export async function fetchEarnings(from: string, to: string): Promise<EarningsEvent[]> {
  const res = await fetch(url('/calendar/earnings', { from, to }), { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.earningsCalendar ?? []
}

export async function fetchEconCalendar(): Promise<EconEvent[]> {
  const res = await fetch(url('/economic-calendar'), { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const data = await res.json()
  return data.economicCalendar ?? []
}
