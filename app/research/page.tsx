import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import {
  fetchQuote,
  fetchCompanyProfile,
  fetchBasicFinancials,
  fetchCompanyNews,
  fetchSentiment,
} from '@/lib/finnhub'

// ─── Wyandanch curriculum ────────────────────────────────────────────────────

const curriculum = [
  { level: 1, title: 'Economic Foundations',      readings: ['Menger', 'Stigler', 'Smith', 'Morck'],               status: 'up-next', href: 'https://wyandanchlibrary.com/track/fundamental'   },
  { level: 2, title: 'Investing Philosophy',       readings: ['Buffett', 'Fisher', 'Marks', 'Graham', 'Taleb'],    status: 'queue',   href: 'https://wyandanchlibrary.com/track/fundamental'   },
  { level: 3, title: 'Macro & Monetary Theory',   readings: ['Keynes', 'Hayek', 'Soros', 'Kahneman', 'Friedman'], status: 'queue',   href: 'https://wyandanchlibrary.com/track/macro'         },
  { level: 4, title: 'Valuation',                  readings: ['Damodaran', 'Fisher/Lynch', 'Edwards/Magee'],       status: 'queue',   href: 'https://wyandanchlibrary.com/track/fundamental'   },
  { level: 5, title: 'Quantitative Foundations',  readings: ['Boyko', 'Econometrics', 'GARCH 101'],               status: 'queue',   href: 'https://wyandanchlibrary.com/track/quantitative'  },
  { level: 6, title: 'Strategy & Implementation', readings: ['Markowitz', 'Black-Litterman', 'Gappy ×3'],         status: 'queue',   href: 'https://wyandanchlibrary.com/track/practitioner'  },
  { level: 7, title: 'Markets & Instruments',     readings: ['Commodities', 'Black-Scholes', 'Fixed Income'],     status: 'queue',   href: 'https://wyandanchlibrary.com/track/practitioner'  },
  { level: 8, title: 'Advanced Topics',           readings: ['Microstructure', 'Stoch. Vol', 'ML Differential'],  status: 'queue',   href: 'https://wyandanchlibrary.com/track/quantitative'  },
]

const statusBadge = (s: string) => {
  if (s === 'done')    return 'bg-green/10 text-green'
  if (s === 'reading') return 'bg-accent/10 text-accent'
  if (s === 'up-next') return 'bg-yellow/10 text-yellow'
  return 'bg-border text-muted'
}
const statusLabel = (s: string) => {
  if (s === 'done')    return 'Done'
  if (s === 'reading') return 'Reading'
  if (s === 'up-next') return 'Up Next'
  return 'Queue'
}

function fmt(n: number | null | undefined, suffix = '') {
  if (n == null) return '—'
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)}B${suffix}`
  if (n >= 1e6)  return `${(n / 1e6).toFixed(1)}M${suffix}`
  return `${n.toFixed(2)}${suffix}`
}

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 60000)
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { searchParams: Promise<{ ticker?: string }> }

export default async function ResearchPage({ searchParams }: Props) {
  const { ticker: rawTicker } = await searchParams
  const ticker = (rawTicker ?? '').toUpperCase().trim()

  const [quote, profile, financials, news, sentiment] = ticker
    ? await Promise.allSettled([
        fetchQuote(ticker),
        fetchCompanyProfile(ticker),
        fetchBasicFinancials(ticker),
        fetchCompanyNews(ticker, 7),
        fetchSentiment(ticker),
      ])
    : [null, null, null, null, null]

  const q = quote?.status      === 'fulfilled' ? quote.value      : null
  const p = profile?.status    === 'fulfilled' ? profile.value    : null
  const f = financials?.status === 'fulfilled' ? financials.value : null
  const n = news?.status       === 'fulfilled' ? news.value       : []
  const s = sentiment?.status  === 'fulfilled' ? sentiment.value  : null

  const upDay = q ? q.dp >= 0 : null

  return (
    <div>
      <PageHeader title="Research" subtitle="Ticker analysis · Wyandanch curriculum · Atkins FIG" />

      {/* ── Ticker search ─────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <form method="GET" className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted uppercase tracking-widest block mb-2">
              Analyze a ticker
            </label>
            <input
              name="ticker"
              defaultValue={ticker}
              placeholder="EVR, AAPL, SPY, BN..."
              className="w-full bg-surface border border-border rounded px-3 py-2 text-white text-sm font-mono placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <button type="submit"
            className="bg-accent text-white text-sm px-5 py-2 rounded hover:bg-accent/80 transition-colors">
            Analyze
          </button>
          {ticker && (
            <a href="/research" className="text-xs text-muted hover:text-white py-2 px-2">Clear</a>
          )}
        </form>
      </Card>

      {/* ── Ticker analysis ───────────────────────────────────────────────── */}
      {ticker && (
        <div className="mb-8">
          {/* Company header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {p?.name ?? ticker}
                <span className="text-muted font-normal ml-2 text-sm">{ticker}</span>
              </h2>
              {p && (
                <p className="text-xs text-muted mt-0.5">
                  {p.exchange} · {p.industry} · {p.country}
                </p>
              )}
            </div>
            {p?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo} alt={p.name} className="w-10 h-10 rounded object-contain bg-white p-1" />
            )}
          </div>

          {/* Price + day stats */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <Card>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Price</p>
              <p className="text-2xl font-bold text-white">{q ? `$${q.c.toFixed(2)}` : '—'}</p>
              {q && (
                <p className={`text-xs mt-1 ${upDay ? 'text-green' : 'text-red'}`}>
                  {upDay ? '↑' : '↓'} {Math.abs(q.d).toFixed(2)} ({Math.abs(q.dp).toFixed(2)}%)
                </p>
              )}
            </Card>
            <Card>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Day Range</p>
              <p className="text-sm text-white">{q ? `$${q.l.toFixed(2)} – $${q.h.toFixed(2)}` : '—'}</p>
              <p className="text-xs text-muted mt-1">Open ${q?.o.toFixed(2) ?? '—'}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">52W Range</p>
              <p className="text-sm text-white">
                {f?.metric?.['52WeekLow'] && f?.metric?.['52WeekHigh']
                  ? `$${f.metric['52WeekLow'].toFixed(2)} – $${f.metric['52WeekHigh'].toFixed(2)}`
                  : '—'}
              </p>
              <p className={`text-xs mt-1 ${(f?.metric?.['52WeekPriceReturnDaily'] ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>
                {f?.metric?.['52WeekPriceReturnDaily'] != null
                  ? `${f.metric['52WeekPriceReturnDaily']!.toFixed(1)}% 1Y` : '—'}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Market Cap</p>
              <p className="text-sm text-white">{fmt(p?.marketCap ? p.marketCap * 1e6 : null)}</p>
              <p className="text-xs text-muted mt-1">{p?.currency ?? '—'}</p>
            </Card>
            <Card>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">Beta</p>
              <p className="text-2xl font-bold text-white">{f?.metric?.beta?.toFixed(2) ?? '—'}</p>
              <p className="text-xs text-muted mt-1">vs. Market</p>
            </Card>
          </div>

          {/* Fundamentals + sentiment + company */}
          <div className="grid grid-cols-3 gap-6 mb-4">
            <Card title="Fundamentals">
              <div className="space-y-2 text-sm">
                {[
                  { label: 'P/E (TTM)',     val: f?.metric?.peNormalizedAnnual?.toFixed(1) ?? '—' },
                  { label: 'P/B',           val: f?.metric?.pbAnnual?.toFixed(2)            ?? '—' },
                  { label: 'P/S',           val: f?.metric?.psAnnual?.toFixed(2)            ?? '—' },
                  { label: 'Net Margin',    val: f?.metric?.netMarginAnnual != null ? `${f.metric.netMarginAnnual.toFixed(1)}%` : '—' },
                  { label: 'ROE',           val: f?.metric?.roeRfy != null ? `${f.metric.roeRfy.toFixed(1)}%` : '—' },
                  { label: 'ROA',           val: f?.metric?.roaRfy != null ? `${f.metric.roaRfy.toFixed(1)}%` : '—' },
                  { label: 'D/E',           val: f?.metric?.debtEquityAnnual?.toFixed(2)    ?? '—' },
                  { label: 'Current Ratio', val: f?.metric?.currentRatioAnnual?.toFixed(2)  ?? '—' },
                  { label: 'Rev Growth 3Y', val: f?.metric?.revenueGrowth3Y != null ? `${f.metric.revenueGrowth3Y.toFixed(1)}%` : '—' },
                  { label: 'EPS Growth 3Y', val: f?.metric?.epsGrowth3Y != null ? `${f.metric.epsGrowth3Y.toFixed(1)}%` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="text-white font-mono text-xs">{val}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Sentiment">
              {s ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted mb-2">Directional Split</p>
                    <div className="flex h-2 rounded overflow-hidden gap-0.5">
                      <div className="bg-green rounded-l" style={{ width: `${(s.sentiment.bullishPercent * 100).toFixed(0)}%` }} />
                      <div className="bg-red rounded-r" style={{ width: `${(s.sentiment.bearishPercent * 100).toFixed(0)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-green">Bull {(s.sentiment.bullishPercent * 100).toFixed(0)}%</span>
                      <span className="text-xs text-red">Bear {(s.sentiment.bearishPercent * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'News Score',       val: s.companyNewsScore.toFixed(2)        },
                      { label: 'Sector Avg',        val: s.sectorAverageNewsScore.toFixed(2)  },
                      { label: 'Articles (7d)',     val: String(s.buzz.articlesInLastWeek)    },
                      { label: 'Buzz vs Avg',       val: `${(s.buzz.buzz / (s.buzz.weeklyAverage || 1) * 100).toFixed(0)}%` },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted">{label}</span>
                        <span className="text-white font-mono text-xs">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">No sentiment data for {ticker}.</p>
              )}
            </Card>

            <Card title="Company">
              {p ? (
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Exchange',    val: p.exchange },
                    { label: 'Industry',    val: p.industry },
                    { label: 'Country',     val: p.country  },
                    { label: 'IPO',         val: p.ipo      },
                    { label: 'Shares Out',  val: fmt(p.shareOutstanding * 1e6) },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-muted flex-shrink-0">{label}</span>
                      <span className="text-white text-right text-xs truncate">{val}</span>
                    </div>
                  ))}
                  {p.weburl && (
                    <a href={p.weburl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline block mt-2">
                      {p.weburl.replace(/^https?:\/\//, '')} ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">No profile found for {ticker}.</p>
              )}
            </Card>
          </div>

          {/* News */}
          <Card title={`${ticker} — Recent News (7 days)`}>
            {(n as any[]).length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {(n as any[]).slice(0, 10).map((h: any, i: number) => (
                  <div key={i} className="border-b border-border pb-2 last:border-0">
                    <a href={h.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-white hover:text-accent leading-snug block">
                      {h.headline}
                    </a>
                    <p className="text-xs text-muted mt-1">{h.source} · {timeAgo(h.datetime)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No news found for {ticker} in the last 7 days.</p>
            )}
          </Card>
        </div>
      )}

      {/* ── Watchlist + Atkins ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card title="Watchlist">
          <p className="text-xs text-muted mb-3">Click a ticker to analyze it above.</p>
          {[
            { ticker: 'EVR', name: 'Evercore Inc.',   notes: 'Atkins FIG — current pitch' },
            { ticker: 'BN',  name: 'Brookfield Corp', notes: 'Mispriced Assets short thesis' },
            { ticker: 'BAM', name: 'Brookfield AM',   notes: 'Mispriced Assets short thesis' },
          ].map(w => (
            <div key={w.ticker} className="flex items-center justify-between border-b border-border py-2 last:border-0">
              <div>
                <a href={`/research?ticker=${w.ticker}`}
                  className="text-accent font-bold text-sm hover:underline">{w.ticker}</a>
                <p className="text-xs text-muted">{w.notes}</p>
              </div>
              <a href={`/research?ticker=${w.ticker}`}
                className="text-xs text-muted hover:text-white transition-colors">Analyze →</a>
            </div>
          ))}
        </Card>

        <Card title="Atkins Investment Group — FIG">
          <div className="space-y-2 text-sm mb-4">
            {[
              { label: 'Role',     val: 'FIG Analyst'        },
              { label: 'Coverage', val: 'Evercore (EVR)'     },
              { label: 'Credits',  val: '2 (Club + Class)'   },
              { label: 'Tools',    val: 'Bloomberg Terminal'  },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted">{label}</span>
                <span className="text-white">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <a href="/research?ticker=EVR"
              className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded hover:bg-accent/20 transition-colors">
              Analyze EVR →
            </a>
            <a href="/internships"
              className="text-xs bg-border text-muted px-3 py-1.5 rounded hover:text-white transition-colors">
              Internship Pipeline →
            </a>
          </div>
        </Card>
      </div>

      {/* ── Wyandanch curriculum ─────────────────────────────────────────── */}
      <Card title="Wyandanch Library">
        <div className="grid grid-cols-4 gap-3">
          {curriculum.map(level => (
            <a
              key={level.level}
              href={level.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface border border-border rounded-lg p-3 hover:border-accent/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted font-mono">L{level.level}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge(level.status)}`}>
                  {statusLabel(level.status)}
                </span>
              </div>
              <p className="text-xs text-white font-medium leading-tight mb-1.5 group-hover:text-accent transition-colors">
                {level.title}
              </p>
              <p className="text-xs text-muted leading-relaxed">{level.readings.join(' · ')}</p>
            </a>
          ))}
        </div>
      </Card>
    </div>
  )
}
