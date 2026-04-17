import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { fetchLatest } from '@/lib/fred'
import { fetchEarnings, fetchEconCalendar } from '@/lib/finnhub'
import { fetchCanvasCalendar } from '@/lib/canvas'

const MACRO_SERIES = [
  { id: 'FEDFUNDS', label: 'Fed Funds',     unit: '%', decimals: 2 },
  { id: 'UNRATE',   label: 'Unemployment',  unit: '%', decimals: 1 },
  { id: 'CPIAUCSL', label: 'CPI',           unit: '',  decimals: 1 },
  { id: 'DGS10',    label: '10Y Yield',     unit: '%', decimals: 2 },
  { id: 'DGS2',     label: '2Y Yield',      unit: '%', decimals: 2 },
  { id: 'T10Y2Y',   label: '10Y–2Y Spread', unit: '%', decimals: 2 },
  { id: 'VIXCLS',   label: 'VIX',          unit: '',  decimals: 2 },
  { id: 'UNRATE',   label: 'Unemployment',  unit: '%', decimals: 1 },
]

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

export default async function CalendarPage() {
  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)

  const [canvasResult, macroResult, econResult, earningsResult] = await Promise.allSettled([
    fetchCanvasCalendar(),
    Promise.allSettled(MACRO_SERIES.map(s => fetchLatest(s.id).then(d => ({ ...s, ...d })))),
    fetchEconCalendar(),
    fetchEarnings(today, in30),
  ])

  const canvas   = canvasResult.status   === 'fulfilled' ? canvasResult.value   : []
  const macro    = macroResult.status    === 'fulfilled' ? macroResult.value    : []
  const econ     = econResult.status     === 'fulfilled' ? econResult.value     : []
  const earnings = earningsResult.status === 'fulfilled' ? earningsResult.value : []

  const topEcon = (econ as any[])
    .filter(e => e.country === 'US' && e.impact?.toLowerCase() === 'high')
    .slice(0, 10)

  const topEarnings = (earnings as any[])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Canvas · Google · FRED & Earnings" />

      {/* ── 1. Canvas ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Canvas — UNH (next 30 days)</p>
        <Card>
          {canvas.length > 0 ? (
            <div className="divide-y divide-border">
              {canvas.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted w-20 flex-shrink-0">{e.date}</span>
                    <div>
                      <p className="text-sm text-white">{e.title}</p>
                      {e.course && <p className="text-xs text-dim">{e.course}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded ${e.type === 'assignment' ? 'bg-accent/10 text-accent' : 'bg-border text-muted'}`}>
                      {e.type}
                    </span>
                    <span className="text-xs font-mono text-dim w-16 text-right">{daysUntil(e.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">No upcoming Canvas events in the next 30 days.</p>
          )}
        </Card>
      </div>

      {/* ── 2. Google Calendar ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Google Calendar — Personal</p>
        <Card>
          <p className="text-sm text-dim">Connect Google Calendar API to populate personal events.</p>
          <p className="text-xs text-muted mt-2">Add OAuth credentials to .env.local → GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET</p>
        </Card>
      </div>

      {/* ── 3. FRED macro + Earnings ───────────────────────────────────────── */}
      <div>
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">FRED & Earnings</p>

        {/* Macro snapshot */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {(macro as any[]).map((r, i) => {
            if (r.status === 'rejected') return (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-1">{MACRO_SERIES[i].label}</p>
                <p className="text-sm text-dim">—</p>
              </div>
            )
            const m  = r.value
            const val = parseFloat(m.latest.value).toFixed(m.decimals)
            const up  = m.change >= 0
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-2">{m.label}</p>
                <p className="text-xl font-semibold text-white">{val}{m.unit}</p>
                <p className={`text-xs mt-1 font-mono ${up ? 'text-green' : 'text-red'}`}>
                  {up ? '+' : ''}{m.change.toFixed(m.decimals)}
                </p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* High-impact economic events */}
          <Card title="High-Impact US Events">
            {topEcon.length > 0 ? (
              <div className="divide-y divide-border">
                {topEcon.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm text-white">{e.event}</p>
                      <p className="text-xs text-dim">{e.time?.slice(0, 10)}</p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>Est: {e.estimate ?? '—'}</p>
                      <p>Prev: {e.prev ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dim">No high-impact US events in next 30 days.</p>
            )}
          </Card>

          {/* Earnings */}
          <Card title="Earnings — Next 30 Days">
            {topEarnings.length > 0 ? (
              <div className="divide-y divide-border">
                {topEarnings.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div>
                      <p className="text-sm font-mono text-accent">{e.symbol}</p>
                      <p className="text-xs text-dim">{e.date} · {e.hour?.toUpperCase()}</p>
                    </div>
                    <p className="text-xs text-muted">EPS est: {e.epsEstimate ?? '—'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dim">No earnings data.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
