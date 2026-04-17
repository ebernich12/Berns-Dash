import Card from '@/components/Card'
import { fetchQuotes } from '@/lib/finnhub'
import { fetchLatest } from '@/lib/fred'
import Link from 'next/link'

const MARKET_TICKERS = ['SPY', 'QQQ', 'IWM', 'GLD']
const MACRO_SERIES   = ['FEDFUNDS', 'DGS10', 'T10Y2Y', 'VIXCLS']
const MACRO_LABELS   = ['Fed Funds', '10Y Yield', '10Y–2Y Spread', 'VIX']

const modules = [
  { href: '/classes',     label: 'Classes',     desc: 'Courses & grades',              tag: 'UNH'      },
  { href: '/internships', label: 'Internships',  desc: 'Applications & pipeline',       tag: 'Career'   },
  { href: '/research',    label: 'Research',     desc: 'Watchlist · Atkins FIG',        tag: 'Finance'  },
  { href: '/calendar',    label: 'Calendar',     desc: 'Macro events · Earnings',       tag: 'Finance'  },
  { href: '/news',        label: 'News',         desc: 'Headlines · Sentiment',         tag: 'Finance'  },
  { href: '/music',       label: 'Music',        desc: 'Lost River Fleet · Socials',    tag: 'Creative' },
]


async function getMarketData() {
  try { return await fetchQuotes(MARKET_TICKERS) } catch { return {} }
}

async function getMacroData() {
  const results = await Promise.allSettled(MACRO_SERIES.map(id => fetchLatest(id)))
  return results.map((r, i) => ({
    label: MACRO_LABELS[i],
    data:  r.status === 'fulfilled' ? r.value : null,
  }))
}

const hour = new Date().getHours()
const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

export default async function Home() {
  const [quotes, macro] = await Promise.all([getMarketData(), getMacroData()])

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <p className="text-dim text-sm mb-1">{greeting}</p>
        <h1 className="text-3xl font-semibold text-white tracking-tight">Ethan Bernich</h1>
        <p className="text-dim text-sm mt-1">
          UNH Finance · Atkins FIG · Lost River Fleet
        </p>
      </div>

      {/* Markets */}
      <div className="mb-8">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Markets</p>
        <div className="grid grid-cols-4 gap-3">
          {MARKET_TICKERS.map(ticker => {
            const q = (quotes as any)[ticker]
            const up = q?.dp != null ? q.dp >= 0 : null
            return (
              <div key={ticker} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted font-mono mb-2">{ticker}</p>
                <p className="text-xl font-semibold text-white">
                  {q ? `$${q.c.toFixed(2)}` : '—'}
                </p>
                {q?.dp != null ? (
                  <p className={`text-xs mt-1.5 font-mono ${up ? 'text-green' : 'text-red'}`}>
                    {up ? '+' : ''}{q.dp.toFixed(2)}%
                  </p>
                ) : (
                  <p className="text-xs text-muted mt-1.5">—</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Macro */}
      <div className="mb-10">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Macro · FRED</p>
        <div className="grid grid-cols-4 gap-3">
          {macro.map(({ label, data }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-2">{label}</p>
              <p className="text-xl font-semibold text-white">
                {data ? `${parseFloat(data.latest.value).toFixed(2)}%` : '—'}
              </p>
              {data && (
                <p className={`text-xs mt-1.5 font-mono ${data.change >= 0 ? 'text-green' : 'text-red'}`}>
                  {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div className="mb-10">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Modules</p>
        <div className="grid grid-cols-3 gap-3">
          {modules.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-card border border-border rounded-xl p-5 hover:border-accent/40 hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-white group-hover:text-accent transition-colors">{m.label}</p>
                <span className="text-2xs text-muted font-mono mt-0.5">{m.tag}</span>
              </div>
              <p className="text-xs text-dim mt-1.5">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
