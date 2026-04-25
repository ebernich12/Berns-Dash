'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function sentimentColor(score: number) {
  return score > 0.3 ? '#30d158' : score < -0.3 ? '#ff453a' : '#636366'
}

function sentimentLabel(score: number) {
  return score > 0.3 ? 'Bullish' : score < -0.3 ? 'Bearish' : 'Neutral'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct   = ((score + 1) / 2) * 100
  const color = sentimentColor(score)
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function ConvictionBanner({ label: lbl, score, sublabel }: { label: string; score: number; sublabel: string }) {
  const color = sentimentColor(score)
  const sl    = sentimentLabel(score)
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-1">{lbl}</p>
        <p className="text-xl font-semibold text-white">{sl}</p>
        <ScoreBar score={score} />
        <p className="text-xs text-muted mt-1.5">{sublabel}</p>
      </div>
      <p className="text-3xl font-mono font-bold ml-4" style={{ color }}>
        {score > 0 ? '+' : ''}{score.toFixed(2)}
      </p>
    </div>
  )
}

function SentimentBadge({ score }: { score: number }) {
  const sl = sentimentLabel(score)
  if (sl === 'Bullish') return <span className="text-xs px-1.5 py-0.5 rounded bg-green/10 text-green font-medium">Bull</span>
  if (sl === 'Bearish') return <span className="text-xs px-1.5 py-0.5 rounded bg-red/10 text-red font-medium">Bear</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted font-medium">Neutral</span>
}

type Headline = {
  source: string; headline: string; url: string; datetime: number
  sentiment: number; breaking: boolean; highImpact: boolean; category?: string
}

function HeadlineFeed({ items }: { items: Headline[] }) {
  if (!items.length) return <p className="text-sm text-muted py-4">No headlines yet.</p>
  return (
    <div className="space-y-3">
      {items.map((h, i) => (
        <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {h.breaking   && <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold uppercase tracking-wide">Breaking</span>}
                {h.highImpact && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 font-bold uppercase tracking-wide">High Impact</span>}
                {h.category   && <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted capitalize">{h.category}</span>}
              </div>
              <a href={h.url} target="_blank" rel="noopener noreferrer"
                className="text-sm leading-snug hover:opacity-80 transition-opacity"
                style={{ color: headlineColor(h.sentiment) }}>
                {h.headline}
              </a>
              <div className="flex items-center gap-2 mt-1.5">
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
  )
}

function MacroCard({ label, value, change, unit = '' }: { label: string; value: number | null; change?: number | null; unit?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted mb-2">{label}</p>
      <p className="text-xl font-semibold text-white">{value != null ? `${value.toFixed(2)}${unit}` : '—'}</p>
      {change != null && (
        <p className={`text-xs mt-1.5 font-mono ${change >= 0 ? 'text-green' : 'text-red'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(3)}
        </p>
      )}
    </div>
  )
}

const CHART_COLORS = {
  fed_funds: '#0a84ff',
  dgs10:     '#30d158',
  dgs2:      '#ff9f0a',
  t10y2y:    '#ff453a',
  hy_spread: '#bf5af2',
}

function RatesChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 6)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} />
        <Tooltip contentStyle={{ background: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: 8 }} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7', fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
        {Object.entries(CHART_COLORS).map(([key, color]) => (
          <Line key={key} type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={1.5} name={key.replace(/_/g, ' ').toUpperCase()} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function CpiPceChart({ cpi, pce }: { cpi: any[]; pce: any[] }) {
  const merged: Record<string, any> = {}
  for (const p of cpi) merged[p.date] = { ...merged[p.date], date: p.date, cpi: p.value }
  for (const p of pce) merged[p.date] = { ...merged[p.date], date: p.date, pce: p.value }
  const data = Object.values(merged).sort((a, b) => a.date.localeCompare(b.date))
  if (!data.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 5)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} />
        <Tooltip contentStyle={{ background: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: 8 }} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7', fontSize: 11 }} />
        <Line type="monotone" dataKey="cpi" stroke="#ff9f0a" dot={false} strokeWidth={1.5} name="CPI" connectNulls />
        <Line type="monotone" dataKey="pce" stroke="#0a84ff" dot={false} strokeWidth={1.5} name="PCE" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

function SentimentHistoryChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet — runs every 2 hours.</p>
  const formatted = data.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }) }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} interval={Math.floor(formatted.length / 6)} />
        <YAxis domain={[-1, 1]} tick={{ fill: '#636366', fontSize: 10 }} />
        <Tooltip contentStyle={{ background: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: 8 }} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7', fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="markets" stroke="#0a84ff" dot={false} strokeWidth={1.5} name="Markets" connectNulls />
        <Line type="monotone" dataKey="world"   stroke="#ff453a" dot={false} strokeWidth={1.5} name="World"   connectNulls />
        <Line type="monotone" dataKey="tech"    stroke="#30d158" dot={false} strokeWidth={1.5} name="Tech"    connectNulls />
        <Line type="monotone" dataKey="global"  stroke="#f5f5f7" dot={false} strokeWidth={2}   name="Global"  connectNulls strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'markets' | 'world' | 'tech' | 'macro' | 'analysis'

const TABS: { key: Tab; label: string }[] = [
  { key: 'home',     label: 'Home'       },
  { key: 'markets',  label: 'Markets'    },
  { key: 'world',    label: 'World'      },
  { key: 'tech',     label: 'Technology' },
  { key: 'macro',    label: 'Macro'      },
  { key: 'analysis', label: 'Analysis'   },
]

// ── Main Client ───────────────────────────────────────────────────────────────

export default function NewsClient({ markets, world, tech, macro, analysis }: {
  markets:  any; world: any; tech: any; macro: any; analysis: any
}) {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.key ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── HOME ──────────────────────────────────────────────────── */}
      {tab === 'home' && (
        <div className="space-y-6">
          {/* Conviction banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {markets?.market_sentiment && <ConvictionBanner label="Markets" score={markets.market_sentiment.score} sublabel="Business & financial" />}
            {world?.world_sentiment    && <ConvictionBanner label="World"   score={world.world_sentiment.score}   sublabel="Geopolitical & general" />}
            {tech?.tech_sentiment      && <ConvictionBanner label="Tech"    score={tech.tech_sentiment.score}     sublabel="Technology sector" />}
          </div>
          {/* Top 10 global headlines */}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Top Stories</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <HeadlineFeed items={analysis?.top10 ?? []} />
            </div>
          </div>
          {/* Sector grid */}
          {markets?.sectors && Object.keys(markets.sectors).length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sector Sentiment</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(markets.sectors).map(([sector, d]: [string, any]) => (
                  <div key={sector} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted mb-0.5">{sector}</p>
                    <p className="text-xs font-mono text-muted mb-2">{d.etf}</p>
                    <p className="text-sm font-semibold" style={{ color: sentimentColor(d.convictionScore) }}>{d.label}</p>
                    <ScoreBar score={d.convictionScore} />
                    <p className="text-xs text-muted mt-2">{d.articles} articles</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MARKETS ───────────────────────────────────────────────── */}
      {tab === 'markets' && (
        <div className="space-y-6">
          {markets?.market_sentiment && (
            <ConvictionBanner label="Market Conviction" score={markets.market_sentiment.score} sublabel="Reuters · WSJ · FT · Finnhub · NewsAPI" />
          )}
          {/* Energy prices */}
          {markets?.energy && Object.keys(markets.energy).length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Energy Prices · EIA</p>
              <div className="grid grid-cols-3 gap-3">
                {markets.energy.wti     && <MacroCard label="WTI Crude"   value={markets.energy.wti.value}     change={markets.energy.wti.change}     unit="$" />}
                {markets.energy.brent   && <MacroCard label="Brent Crude" value={markets.energy.brent.value}   change={markets.energy.brent.change}   unit="$" />}
                {markets.energy.nat_gas && <MacroCard label="Nat Gas"     value={markets.energy.nat_gas.value} change={markets.energy.nat_gas.change} unit="$" />}
              </div>
            </div>
          )}
          {/* Sector sentiment */}
          {markets?.sectors && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sector Sentiment</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(markets.sectors).map(([sector, d]: [string, any]) => (
                  <div key={sector} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted mb-0.5">{sector}</p>
                    <p className="text-xs font-mono text-muted mb-2">{d.etf}</p>
                    <p className="text-sm font-semibold" style={{ color: sentimentColor(d.convictionScore) }}>{d.label}</p>
                    <ScoreBar score={d.convictionScore} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Market Headlines</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <HeadlineFeed items={markets?.headlines ?? []} />
            </div>
          </div>
        </div>
      )}

      {/* ── WORLD ─────────────────────────────────────────────────── */}
      {tab === 'world' && (
        <div className="space-y-6">
          {world?.world_sentiment && (
            <ConvictionBanner label="World Conviction" score={world.world_sentiment.score} sublabel="Reuters World · NewsAPI General" />
          )}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">World Headlines</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <HeadlineFeed items={world?.headlines ?? []} />
            </div>
          </div>
        </div>
      )}

      {/* ── TECHNOLOGY ────────────────────────────────────────────── */}
      {tab === 'tech' && (
        <div className="space-y-6">
          {tech?.tech_sentiment && (
            <ConvictionBanner label="Tech Conviction" score={tech.tech_sentiment.score} sublabel="NewsAPI Tech · Finnhub (AAPL/MSFT/NVDA/GOOGL/META)" />
          )}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Technology Headlines</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <HeadlineFeed items={tech?.headlines ?? []} />
            </div>
          </div>
        </div>
      )}

      {/* ── MACRO ─────────────────────────────────────────────────── */}
      {tab === 'macro' && (
        <div className="space-y-6">
          {/* Key indicators */}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Rates & Spreads</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['fed_funds', 'dgs10', 'dgs2', 't10y2y', 'hy_spread'].map(key => {
                const d = macro?.indicators?.[key]
                return d ? <MacroCard key={key} label={d.label} value={d.value} change={d.change} unit="%" /> : null
              })}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Inflation & Growth</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['cpi', 'pce', 'unemployment', 'gdp'].map(key => {
                const d = macro?.indicators?.[key]
                return d ? <MacroCard key={key} label={d.label} value={d.value} change={d.change} unit={key === 'unemployment' ? '%' : ''} /> : null
              })}
            </div>
          </div>
          {/* Jobs */}
          {macro?.jobs && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Jobs Report · {macro.jobs.source}</p>
              <div className="grid grid-cols-2 gap-3">
                <MacroCard label={`Nonfarm Payrolls (${macro.jobs.period ?? ''})`} value={macro.jobs.nonfarm_payrolls ? macro.jobs.nonfarm_payrolls / 1000 : null} unit="K" />
                <MacroCard label="Unemployment Rate" value={macro.jobs.unemployment_rate} unit="%" />
              </div>
            </div>
          )}
          {/* GDP */}
          {macro?.gdp && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">GDP · {macro.gdp.source}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MacroCard label={`Real GDP (${macro.gdp.period ?? ''})`} value={macro.gdp.value} unit="%" />
              </div>
            </div>
          )}
          {/* EIA Inventories */}
          {macro?.inventories && Object.keys(macro.inventories).length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">EIA Inventories</p>
              <div className="grid grid-cols-2 gap-3">
                {macro.inventories.crude_inventory    && <MacroCard label="Crude Oil Inventory (Mbbl)"   value={macro.inventories.crude_inventory.value}    change={macro.inventories.crude_inventory.change}    />}
                {macro.inventories.gasoline_inventory && <MacroCard label="Gasoline Inventory (Mbbl)"    value={macro.inventories.gasoline_inventory.value}  change={macro.inventories.gasoline_inventory.change}  />}
              </div>
            </div>
          )}
          {/* Rates chart */}
          {macro?.history?.rates?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Rates History · 120 Days</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <RatesChart data={macro.history.rates} />
              </div>
            </div>
          )}
          {/* CPI / PCE chart */}
          {(macro?.history?.cpi?.length > 0 || macro?.history?.pce?.length > 0) && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">CPI & PCE History</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <CpiPceChart cpi={macro.history.cpi ?? []} pce={macro.history.pce ?? []} />
              </div>
            </div>
          )}
          {/* Macro analysis */}
          {macro?.analysis && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Macro Analysis · Groq</p>
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{macro.analysis}</p>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYSIS ──────────────────────────────────────────────── */}
      {tab === 'analysis' && (
        <div className="space-y-6">
          {/* Global conviction */}
          {analysis?.global_conviction && (
            <ConvictionBanner label="Global Conviction" score={analysis.global_conviction.score} sublabel="Markets 50% · World 30% · Tech 20%" />
          )}
          {/* Sector breakdown */}
          {analysis?.sectors && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Conviction by Sector</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(analysis.sectors).map(([key, d]: [string, any]) => (
                  <div key={key} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted mb-1 capitalize">{key}</p>
                    <p className="text-lg font-mono font-bold" style={{ color: sentimentColor(d.score) }}>
                      {d.score > 0 ? '+' : ''}{d.score.toFixed(2)}
                    </p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: sentimentColor(d.score) }}>{d.label}</p>
                    <ScoreBar score={d.score} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Directional brief */}
          {analysis?.brief && (
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Market Brief · Groq Directional</p>
              <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{analysis.brief}</p>
            </div>
          )}
          {/* Sentiment history chart */}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sentiment History</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <SentimentHistoryChart data={analysis?.sentiment_history ?? []} />
            </div>
          </div>
          {/* Top 10 ranked headlines */}
          {analysis?.top10?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Top 10 Global Stories · Groq Ranked</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <HeadlineFeed items={analysis.top10} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
