import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import { fmtDateTimeET } from '@/lib/time'

export const dynamic = 'force-dynamic'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return n.toFixed(2)
}

export default async function FinancePage() {
  const trading = await getSnapshot('trading')
  const quotes  = trading?.quotes  ?? {}
  const macro   = trading?.macro   ?? []
  const comment = trading?.commentary
  const ts      = trading?.updated_at

  const TICKERS = ['SPY', 'QQQ', 'IWM', 'GLD']

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle={ts ? `Updated ${fmtDateTimeET(ts)} ET` : 'Waiting for TradingAgent'}
      />

      {/* Markets */}
      <div className="mb-6">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Markets</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TICKERS.map(sym => {
            const q  = quotes[sym]
            const up = q?.dp != null ? q.dp >= 0 : null
            return (
              <div key={sym} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted font-mono mb-2">{sym}</p>
                <p className="text-xl font-semibold text-white">{q ? `$${q.c.toFixed(2)}` : '—'}</p>
                {q?.dp != null ? (
                  <p className={`text-xs mt-1.5 font-mono ${up ? 'text-green' : 'text-red'}`}>
                    {up ? '+' : ''}{q.dp.toFixed(2)}%
                  </p>
                ) : <p className="text-xs text-muted mt-1.5">—</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Macro */}
      <div className="mb-6">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Macro · FRED</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {macro.length > 0 ? macro.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-2">{m.label}</p>
              <p className="text-xl font-semibold text-white">{m.value.toFixed(2)}</p>
              <p className={`text-xs mt-1.5 font-mono ${m.change >= 0 ? 'text-green' : 'text-red'}`}>
                {m.change >= 0 ? '+' : ''}{m.change.toFixed(2)}
              </p>
            </div>
          )) : (
            ['Fed Funds', '10Y Yield', '10Y–2Y Spread', 'VIX'].map(label => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-2">{label}</p>
                <p className="text-xl font-semibold text-white">—</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Commentary */}
      {comment && (
        <Card className="mb-6">
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Market Commentary</p>
          <p className="text-sm text-white leading-relaxed">{comment}</p>
        </Card>
      )}

      {/* Watchlist */}
      <Card title="Watchlist">
        <p className="text-xs text-muted mb-3">Atkins FIG coverage</p>
        {[
          { ticker: 'EVR', notes: 'Atkins FIG — current pitch'    },
          { ticker: 'BN',  notes: 'Mispriced Assets short thesis' },
          { ticker: 'BAM', notes: 'Mispriced Assets short thesis' },
        ].map(w => (
          <div key={w.ticker} className="flex items-center justify-between border-b border-border py-2 last:border-0">
            <div>
              <span className="text-accent font-bold text-sm">{w.ticker}</span>
              <p className="text-xs text-muted">{w.notes}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
