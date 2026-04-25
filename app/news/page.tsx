import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import { fmtDateTimeET } from '@/lib/time'
import NewsClient from './NewsClient'

export const dynamic = 'force-dynamic'

function ScoreBar({ score }: { score: number }) {
  const pct   = ((score + 1) / 2) * 100
  const color = score > 0.3 ? '#30d158' : score < -0.3 ? '#ff453a' : '#636366'
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function SentimentCard({ label, score, sublabel }: { label: string; score: number; sublabel: string }) {
  const color = score > 0.3 ? '#30d158' : score < -0.3 ? '#ff453a' : '#636366'
  const text  = score > 0.3 ? 'Bullish' : score < -0.3 ? 'Bearish' : 'Neutral'
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-semibold text-white">{text}</p>
        <ScoreBar score={score} />
        <p className="text-xs text-muted mt-1.5">{sublabel}</p>
      </div>
      <p className="text-3xl font-mono font-bold ml-4" style={{ color }}>
        {score > 0 ? '+' : ''}{score.toFixed(2)}
      </p>
    </div>
  )
}

export default async function NewsPage() {
  const data    = await getSnapshot('news')
  const ts      = data?.updated_at
  const market  = data?.market_sentiment  ?? null
  const world   = data?.world_sentiment   ?? null
  const sectors: Record<string, any> = data?.sectors  ?? {}
  const macro:   any[] = data?.macro    ?? []
  const headlines = data?.headlines ?? { markets: [], world: [], tech: [] }

  return (
    <div>
      <PageHeader
        title="News & Sentiment"
        subtitle={ts ? `Updated ${fmtDateTimeET(ts)} ET · every 2 hours` : 'Waiting for NewsAgent'}
      />

      {!data && (
        <p className="text-sm text-dim mt-4">No data yet — NewsAgent hasn't run.</p>
      )}

      {/* ── Sentiment Banners ──────────────────────────────────────── */}
      {(market || world) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {market && <SentimentCard label="Market Sentiment" score={market.score} sublabel="Business & Financial headlines" />}
          {world  && <SentimentCard label="World Sentiment"  score={world.score}  sublabel="Geopolitical & general news"   />}
        </div>
      )}

      {/* ── Sector Sentiment ───────────────────────────────────────── */}
      {Object.keys(sectors).length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sector Sentiment</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(sectors).map(([sector, d]) => {
              const color = d.convictionScore > 0.3 ? '#30d158' : d.convictionScore < -0.3 ? '#ff453a' : '#636366'
              return (
                <div key={sector} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted mb-0.5">{sector}</p>
                  <p className="text-xs font-mono text-muted mb-2">{d.etf}</p>
                  <p className="text-sm font-semibold" style={{ color }}>{d.label}</p>
                  <ScoreBar score={d.convictionScore} />
                  <p className="text-xs text-muted mt-2">{d.articles} articles</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Macro ──────────────────────────────────────────────────── */}
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

      {/* ── Headlines (tabbed, client) ─────────────────────────────── */}
      <NewsClient headlines={headlines} />
    </div>
  )
}
