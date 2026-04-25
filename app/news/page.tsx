import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import { fmtDateTimeET } from '@/lib/time'

export const dynamic = 'force-dynamic'

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 60000)
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function SentimentBadge({ score }: { score: number }) {
  if (score >  0.3) return <span className="text-xs px-2 py-0.5 rounded bg-green/10 text-green font-medium">Bullish</span>
  if (score < -0.3) return <span className="text-xs px-2 py-0.5 rounded bg-red/10 text-red font-medium">Bearish</span>
  return <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted font-medium">Neutral</span>
}

function ScoreBar({ score }: { score: number }) {
  const pct    = ((score + 1) / 2) * 100
  const color  = score > 0.3 ? '#30d158' : score < -0.3 ? '#ff453a' : '#636366'
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

export default async function NewsPage() {
  const data   = await getSnapshot('news')
  const ts     = data?.updated_at
  const market = data?.market_sentiment ?? null
  const headlines: any[] = data?.headlines ?? []
  const sectors: Record<string, any> = data?.sectors ?? {}
  const macro: any[] = data?.macro ?? []

  return (
    <div>
      <PageHeader
        title="News & Sentiment"
        subtitle={ts ? `Updated ${fmtDateTimeET(ts)} ET` : 'Waiting for NewsAgent'}
      />

      {!data && (
        <p className="text-sm text-dim mt-4">No data yet — NewsAgent hasn't run.</p>
      )}

      {/* ── Market Sentiment Banner ────────────────────────────────── */}
      {market && (
        <div className="mb-6 bg-card border border-border rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-1">Overall Market Sentiment</p>
            <p className="text-2xl font-semibold text-white">{market.label}</p>
            <ScoreBar score={market.score} />
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-bold" style={{
              color: market.score > 0.3 ? '#30d158' : market.score < -0.3 ? '#ff453a' : '#636366'
            }}>
              {market.score > 0 ? '+' : ''}{market.score.toFixed(2)}
            </p>
            <p className="text-xs text-muted mt-1">conviction score</p>
          </div>
        </div>
      )}

      {/* ── Sector Sentiment Grid ──────────────────────────────────── */}
      {Object.keys(sectors).length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sector Sentiment</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(sectors).map(([sector, d]) => (
              <div key={sector} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-1">{sector}</p>
                <p className="text-xs font-mono text-muted mb-2">{d.etf}</p>
                <SentimentBadge score={d.convictionScore} />
                <ScoreBar score={d.convictionScore} />
                <p className="text-xs text-muted mt-2">{d.articles} articles</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Macro Snapshot ─────────────────────────────────────────── */}
      {macro.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Macro · FRED</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {macro.map((m: any) => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-2">{m.label}</p>
                <p className="text-xl font-semibold text-white">{m.value.toFixed(2)}</p>
                <p className={`text-xs mt-1.5 font-mono ${m.change >= 0 ? 'text-green' : 'text-red'}`}>
                  {m.change >= 0 ? '+' : ''}{m.change.toFixed(3)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Headlines Feed ─────────────────────────────────────────── */}
      <Card title={headlines.length > 0 ? `Headlines (${headlines.length})` : 'Headlines'}>
        <div className="space-y-3">
          {(headlines.length > 0 ? headlines : [{
            source: '—', headline: 'Waiting for NewsAgent to post headlines', url: '#', datetime: Date.now() / 1000, sentiment: 0,
          }]).map((h: any, i: number) => (
            <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-accent transition-colors leading-snug"
                  >
                    {h.headline}
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted font-bold">{h.source}</span>
                    <span className="text-xs text-muted">{timeAgo(h.datetime)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <SentimentBadge score={h.sentiment ?? 0} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
