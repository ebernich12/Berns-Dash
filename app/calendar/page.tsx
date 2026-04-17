import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { fetchLatest } from '@/lib/fred'
import { fetchEarnings, fetchEconCalendar } from '@/lib/finnhub'

const MACRO_SERIES = [
  { id: 'FEDFUNDS', label: 'Fed Funds Rate',    unit: '%', decimals: 2 },
  { id: 'UNRATE',   label: 'Unemployment',       unit: '%', decimals: 1 },
  { id: 'CPIAUCSL', label: 'CPI',                unit: '',  decimals: 1 },
  { id: 'DGS10',    label: '10Y Yield',          unit: '%', decimals: 2 },
  { id: 'DGS2',     label: '2Y Yield',           unit: '%', decimals: 2 },
  { id: 'T10Y2Y',   label: '10Y-2Y Spread',      unit: '%', decimals: 2 },
  { id: 'VIXCLS',   label: 'VIX',               unit: '',  decimals: 2 },
  { id: 'M2SL',     label: 'M2 Money Supply',   unit: 'B', decimals: 0 },
]

const impactColor = (impact: string) => {
  const i = impact?.toLowerCase()
  if (i === 'high')   return 'bg-red/10 text-red'
  if (i === 'medium') return 'bg-yellow/10 text-yellow'
  return 'bg-border text-muted'
}

async function getData() {
  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)

  const [macro, econ, earnings] = await Promise.allSettled([
    Promise.allSettled(MACRO_SERIES.map(s => fetchLatest(s.id).then(d => ({ ...s, ...d })))),
    fetchEconCalendar(),
    fetchEarnings(today, in30),
  ])

  return {
    macro:    macro.status    === 'fulfilled' ? macro.value    : [],
    econ:     econ.status     === 'fulfilled' ? econ.value     : [],
    earnings: earnings.status === 'fulfilled' ? earnings.value : [],
  }
}

export default async function CalendarPage() {
  const { macro, econ, earnings } = await getData()
  const hasFinnhub = !!process.env.FINNHUB_API_KEY

  // Filter to high-impact US econ events
  const topEcon = (econ as any[])
    .filter(e => e.country === 'US' && e.impact?.toLowerCase() === 'high')
    .slice(0, 8)

  // Key earnings — sort by date
  const topEarnings = (earnings as any[])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div>
      <PageHeader
        title="Economic Calendar"
        subtitle="FRED macro snapshot · Finnhub earnings & economic events"
      />

      {/* FRED macro grid */}
      <p className="text-xs text-muted uppercase tracking-widest mb-3">Macro Snapshot (FRED · Live)</p>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {(macro as any[]).map((r, i) => {
          if (r.status === 'rejected') {
            return (
              <Card key={MACRO_SERIES[i].id}>
                <p className="text-xs text-muted uppercase tracking-widest mb-1">{MACRO_SERIES[i].label}</p>
                <p className="text-sm text-red">Error</p>
              </Card>
            )
          }
          const m = r.value
          const val = parseFloat(m.latest.value).toFixed(m.decimals)
          const up  = m.change >= 0
          return (
            <Card key={m.id}>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">{m.label}</p>
              <p className="text-2xl font-bold text-white">{val}{m.unit}</p>
              <p className={`text-xs mt-1 ${up ? 'text-green' : 'text-red'}`}>
                {up ? '↑' : '↓'} {Math.abs(m.change).toFixed(m.decimals)} ({m.pctChange.toFixed(2)}%)
              </p>
              <p className="text-xs text-muted mt-1">As of {m.latest.date}</p>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Economic events */}
        <Card title={hasFinnhub ? 'High-Impact US Events (Finnhub · Live)' : 'Economic Events (add FINNHUB_API_KEY)'}>
          {topEcon.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs border-b border-border">
                  <th className="text-left pb-2">Date</th>
                  <th className="text-left pb-2">Event</th>
                  <th className="text-left pb-2">Est</th>
                  <th className="text-left pb-2">Prev</th>
                </tr>
              </thead>
              <tbody>
                {topEcon.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 text-xs text-white">{e.time?.slice(0, 10)}</td>
                    <td className="py-2 text-xs text-white">{e.event}</td>
                    <td className="py-2 text-xs text-muted">{e.estimate ?? '—'}</td>
                    <td className="py-2 text-xs text-muted">{e.prev ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">
              {hasFinnhub ? 'No high-impact US events in next 30 days.' : 'Add FINNHUB_API_KEY to .env.local'}
            </p>
          )}
        </Card>

        {/* Earnings calendar */}
        <Card title={hasFinnhub ? 'Earnings Calendar (Next 30 Days)' : 'Earnings (add FINNHUB_API_KEY)'}>
          {topEarnings.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs border-b border-border">
                  <th className="text-left pb-2">Date</th>
                  <th className="text-left pb-2">Symbol</th>
                  <th className="text-left pb-2">EPS Est</th>
                  <th className="text-left pb-2">When</th>
                </tr>
              </thead>
              <tbody>
                {topEarnings.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 text-xs text-white">{e.date}</td>
                    <td className="py-2 text-xs text-accent font-bold">{e.symbol}</td>
                    <td className="py-2 text-xs text-muted">{e.epsEstimate ?? '—'}</td>
                    <td className="py-2 text-xs text-muted uppercase">{e.hour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">
              {hasFinnhub ? 'No earnings data.' : 'Add FINNHUB_API_KEY to .env.local'}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
