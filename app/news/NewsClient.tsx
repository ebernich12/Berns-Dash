'use client'

import { useState } from 'react'
import Card from '@/components/Card'

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() - unix * 1000) / 60000)
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function headlineColor(score: number) {
  if (score >  0.6) return '#34c759'
  if (score >  0.3) return '#86efac'
  if (score < -0.6) return '#ff453a'
  if (score < -0.3) return '#fca5a5'
  return '#f5f5f7'
}

function SentimentBadge({ score }: { score: number }) {
  if (score >  0.3) return <span className="text-xs px-1.5 py-0.5 rounded bg-green/10 text-green font-medium">Bull</span>
  if (score < -0.3) return <span className="text-xs px-1.5 py-0.5 rounded bg-red/10 text-red font-medium">Bear</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted font-medium">Neutral</span>
}

type Headline = {
  source: string
  headline: string
  url: string
  datetime: number
  sentiment: number
  breaking: boolean
  highImpact: boolean
}

type Tab = 'markets' | 'world' | 'tech'

const TABS: { key: Tab; label: string }[] = [
  { key: 'markets', label: 'Markets'   },
  { key: 'world',   label: 'World'     },
  { key: 'tech',    label: 'Technology'},
]

export default function NewsClient({
  headlines,
}: {
  headlines: { markets: Headline[]; world: Headline[]; tech: Headline[] }
}) {
  const [tab, setTab] = useState<Tab>('markets')
  const items = headlines[tab] ?? []

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.key
                ? 'bg-white/10 text-white'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-muted font-mono">{headlines[t.key]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <Card>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted">No headlines yet.</p>
          ) : items.map((h, i) => (
            <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Flags */}
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {h.breaking && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase tracking-wide">Breaking</span>
                    )}
                    {h.highImpact && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-bold uppercase tracking-wide">High Impact</span>
                    )}
                  </div>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm leading-snug hover:opacity-80 transition-opacity"
                    style={{ color: headlineColor(h.sentiment) }}
                  >
                    {h.headline}
                  </a>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted font-bold">{h.source}</span>
                    <span className="text-xs text-muted">{timeAgo(h.datetime)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <SentimentBadge score={h.sentiment} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
