// Alpaca Markets API — paper trading + market data
// Docs: https://docs.alpaca.markets

const PAPER_BASE  = 'https://paper-api.alpaca.markets'
const DATA_BASE   = 'https://data.alpaca.markets'
const API_KEY     = process.env.ALPACA_API_KEY     ?? ''
const API_SECRET  = process.env.ALPACA_SECRET_KEY  ?? ''

function headers() {
  return {
    'APCA-API-KEY-ID':     API_KEY,
    'APCA-API-SECRET-KEY': API_SECRET,
  }
}

export interface AccountInfo {
  buyingPower:   number
  portfolioValue: number
  cash:          number
  pnl:           number
  status:        string
}

export interface Position {
  symbol:        string
  qty:           number
  marketValue:   number
  unrealizedPnl: number
  changePercent: number
}

export interface Bar {
  symbol: string
  close:  number
  change: number
  changePct: number
}

export async function fetchAccount(): Promise<AccountInfo | null> {
  if (!API_KEY) return null
  const res = await fetch(`${PAPER_BASE}/v2/account`, {
    headers: headers(),
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  const d = await res.json()
  return {
    buyingPower:    parseFloat(d.buying_power),
    portfolioValue: parseFloat(d.portfolio_value),
    cash:           parseFloat(d.cash),
    pnl:            parseFloat(d.equity) - parseFloat(d.last_equity),
    status:         d.status,
  }
}

export async function fetchPositions(): Promise<Position[]> {
  if (!API_KEY) return []
  const res = await fetch(`${PAPER_BASE}/v2/positions`, {
    headers: headers(),
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.map((p: any) => ({
    symbol:        p.symbol,
    qty:           parseFloat(p.qty),
    marketValue:   parseFloat(p.market_value),
    unrealizedPnl: parseFloat(p.unrealized_pl),
    changePercent: parseFloat(p.unrealized_plpc) * 100,
  }))
}

export async function fetchBars(symbols: string[]): Promise<Bar[]> {
  if (!API_KEY || !symbols.length) return []
  const syms = symbols.join(',')
  const res = await fetch(
    `${DATA_BASE}/v2/stocks/snapshots?symbols=${syms}`,
    { headers: headers(), next: { revalidate: 300 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return symbols.map((s) => {
    const snap = data[s]
    if (!snap) return null
    const close = snap.dailyBar?.c ?? 0
    const prev  = snap.prevDailyBar?.c ?? close
    const change = close - prev
    return {
      symbol:    s,
      close,
      change,
      changePct: prev ? (change / prev) * 100 : 0,
    }
  }).filter(Boolean) as Bar[]
}
