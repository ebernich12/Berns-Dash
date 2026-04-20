import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'

export const dynamic = 'force-dynamic'

function sentimentLabel(score: number) {
  if (score > 0.6) return { label: 'Positive', cls: 'bg-green/10 text-green' }
  if (score < 0.4) return { label: 'Negative', cls: 'bg-red/10 text-red'   }
  return               { label: 'Neutral',  cls: 'bg-border text-muted'    }
}

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 60000)
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

export default async function NewsPage() {
  const data      = await getSnapshot('finance')
  const headlines = data?.headlines ?? []
  const sentiment = data?.sentiment ?? {}
  const ts        = data?.updated_at

  const TICKERS = ['EVR', 'BN', 'BAM']

  return (
    <div>
      <PageHeader
        title="News & Sentiment"
        subtitle={ts ? `Collected ${new Date(ts).toLocaleString()}` : 'Waiting for FinanceAgent'}
      />

      {/* Sentiment cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {TICKERS.map(sym => {
          const d     = sentiment[sym]
          const score = d?.companyNewsScore ?? null
          const sl    = score !== null ? sentimentLabel(score) : null
          return (
            <Card key={sym}>
              <p className="text-xs text-muted uppercase tracking-widest mb-1">{sym} Sentiment</p>
              {sl && d ? (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded ${sl.cls}`}>{sl.label}</span>
                  <p className="text-xs text-muted mt-2">
                    Bull {((d.sentiment.bullishPercent ?? 0) * 100).toFixed(0)}% ·
                    Bear {((d.sentiment.bearishPercent ?? 0) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted">{d.buzz.articlesInLastWeek} articles this week</p>
                </>
              ) : (
                <p className="text-sm text-muted">No data</p>
              )}
            </Card>
          )
        })}
      </div>

      {/* Headlines */}
      <Card title={headlines.length > 0 ? 'Market Headlines' : 'Headlines'}>
        <div className="space-y-3">
          {(headlines.length > 0 ? headlines : [
            { source: '—', headline: 'Waiting for FinanceAgent to post headlines', url: '#', datetime: Date.now() / 1000 },
          ]).map((h: any, i: number) => (
            <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <a href={h.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-white hover:text-accent transition-colors leading-snug">
                    {h.headline}
                  </a>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted font-bold">{h.source}</span>
                    <span className="text-xs text-muted">{timeAgo(h.datetime)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
