import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { fetchMarketNews, fetchSentiment } from '@/lib/finnhub'

// Add tickers here as you build your watchlist
const WATCHLIST = ['EVR'] // Evercore — current Atkins coverage

function sentimentLabel(score: number) {
  if (score > 0.6) return { label: 'Positive', cls: 'bg-green/10 text-green' }
  if (score < 0.4) return { label: 'Negative', cls: 'bg-red/10 text-red'   }
  return               { label: 'Neutral',  cls: 'bg-border text-muted'    }
}

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 60000)
  if (diff < 60)  return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

async function getData() {
  const [news, ...sentiments] = await Promise.allSettled([
    fetchMarketNews('general'),
    ...WATCHLIST.map(s => fetchSentiment(s)),
  ])
  return {
    headlines: news.status === 'fulfilled' ? news.value : [],
    sentiments: WATCHLIST.map((s, i) => ({
      symbol: s,
      data: sentiments[i].status === 'fulfilled' ? sentiments[i].value : null,
    })),
  }
}

export default async function NewsPage() {
  const { headlines, sentiments } = await getData()
  const hasKey = !!process.env.FINNHUB_API_KEY

  return (
    <div>
      <PageHeader
        title="News & Sentiment"
        subtitle={hasKey ? 'Live — refreshes every 30 min' : 'Add FINNHUB_API_KEY to .env.local to go live'}
      />

      {/* Sentiment cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {WATCHLIST.length === 0 ? (
          <Card>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Sentiment</p>
            <p className="text-sm text-muted">Add tickers to WATCHLIST in news/page.tsx</p>
          </Card>
        ) : (
          sentiments.map(({ symbol, data }) => {
            const score = data?.companyNewsScore ?? null
            const sl = score !== null ? sentimentLabel(score) : null
            return (
              <Card key={symbol}>
                <p className="text-xs text-muted uppercase tracking-widest mb-1">{symbol} Sentiment</p>
                {sl ? (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded ${sl.cls}`}>{sl.label}</span>
                    <p className="text-xs text-muted mt-2">
                      Bull {((data?.sentiment.bullishPercent ?? 0) * 100).toFixed(0)}% ·
                      Bear {((data?.sentiment.bearishPercent ?? 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-muted">{data?.buzz.articlesInLastWeek} articles this week</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">No data</p>
                )}
              </Card>
            )
          })
        )}
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Last Refresh</p>
          <p className="text-sm text-white">On page load</p>
          <p className="text-xs text-muted mt-1">30-min heartbeat agent — coming soon</p>
        </Card>
      </div>

      {/* Headlines */}
      <Card title={headlines.length > 0 ? 'Market Headlines (Finnhub · Live)' : 'Headlines (placeholder)'}>
        <div className="space-y-3">
          {(headlines.length > 0 ? headlines : [
            { source: 'WSJ',       headline: 'Sample headline — add Finnhub key to go live', summary: '', url: '#', datetime: Date.now() / 1000, category: '', },
          ]).map((h: any, i: number) => (
            <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-accent transition-colors leading-snug"
                  >
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
