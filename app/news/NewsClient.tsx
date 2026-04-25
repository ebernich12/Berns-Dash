'use client'

import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'

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

const TOOLTIP = {
  contentStyle: { background: '#1c1c1e', border: '1px solid #2c2c2e', borderRadius: 8 },
  labelStyle: { color: '#f5f5f7' },
  itemStyle:  { color: '#f5f5f7', fontSize: 11 },
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1.5">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: sentimentColor(score) }} />
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
  if (sl === 'Bullish') return <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">Bull</span>
  if (sl === 'Bearish') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">Bear</span>
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
                {h.breaking   && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wide">Breaking</span>}
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
        <p className={`text-xs mt-1.5 font-mono ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(3)}
        </p>
      )}
    </div>
  )
}

function MacroStripCard({ label, value, change, unit = '' }: { label: string; value: number | null; change?: number | null; unit?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className="text-xs text-muted mb-1 font-mono uppercase tracking-widest truncate">{label}</p>
      <p className="text-lg font-semibold text-white">{value != null ? `${value.toFixed(2)}${unit}` : '—'}</p>
      {change != null && (
        <p className={`text-xs font-mono mt-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}
        </p>
      )}
    </div>
  )
}

function SummaryCard({ data }: { data: any }) {
  if (!data) return null
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {data.summary && <p className="text-sm text-white leading-relaxed">{data.summary}</p>}
      {data.outlook && (
        <p className="text-sm font-medium" style={{ color: data.outlook.toLowerCase().includes('bull') || data.outlook.toLowerCase().includes('risk-on') ? '#30d158' : data.outlook.toLowerCase().includes('bear') || data.outlook.toLowerCase().includes('risk-off') ? '#ff453a' : '#8e8e93' }}>
          {data.outlook}
        </p>
      )}
      {(data.tailwinds?.length > 0 || data.headwinds?.length > 0) && (
        <div className="grid grid-cols-2 gap-4 pt-1">
          {data.tailwinds?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">Tailwinds</p>
              <ul className="space-y-1.5">
                {data.tailwinds.map((t: string, i: number) => (
                  <li key={i} className="text-xs text-green-400 flex gap-1.5 leading-snug"><span className="mt-0.5 flex-shrink-0">↑</span>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {data.headwinds?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">Headwinds</p>
              <ul className="space-y-1.5">
                {data.headwinds.map((h: string, i: number) => (
                  <li key={i} className="text-xs text-red-400 flex gap-1.5 leading-snug"><span className="mt-0.5 flex-shrink-0">↓</span>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BriefCard({ text }: { text: string }) {
  if (!text) return null
  const sections = [
    { key: 'CONVICTION', color: '#f5f5f7' },
    { key: 'MARKET',     color: '#f5f5f7' },
    { key: 'MACRO',      color: '#f5f5f7' },
    { key: 'KEY RISK',   color: '#ff9f0a' },
    { key: 'POSITIONING', color: '#0a84ff' },
  ]
  const parsed: { label: string; text: string; color: string }[] = []
  let remaining = text
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    const pattern = new RegExp(`${s.key}:([\\s\\S]*?)(?=${sections.slice(i + 1).map(n => n.key + ':').join('|')}|$)`, 'i')
    const match = remaining.match(pattern)
    if (match) {
      parsed.push({ label: s.key, text: match[1].trim(), color: s.color })
    }
  }
  if (!parsed.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Market Brief · Groq</p>
        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    )
  }
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <p className="text-xs text-muted font-mono uppercase tracking-widest">Market Brief · Groq</p>
      {parsed.map((s, i) => (
        <div key={i}>
          <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: '#636366' }}>{s.label}</p>
          <p className="text-sm leading-relaxed" style={{ color: s.label === 'CONVICTION' ? (s.text.includes('BULL') || s.text.includes('RISK-ON') ? '#30d158' : s.text.includes('BEAR') || s.text.includes('RISK-OFF') ? '#ff453a' : s.text.includes('STAGFLATION') ? '#ff9f0a' : '#f5f5f7') : s.color }}>{s.text}</p>
        </div>
      ))}
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
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 6)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} />
        <Tooltip {...TOOLTIP} />
        <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
        {Object.entries(CHART_COLORS).map(([key, color]) => (
          <Line key={key} type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={1.5} name={key.replace(/_/g, ' ').toUpperCase()} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function InflationChart({ cpi, pce }: { cpi: any[]; pce: any[] }) {
  const merged: Record<string, any> = {}
  for (const p of cpi) merged[p.date] = { ...merged[p.date], date: p.date, cpi: p.value }
  for (const p of pce) merged[p.date] = { ...merged[p.date], date: p.date, pce: p.value }
  const data = Object.values(merged).sort((a, b) => a.date.localeCompare(b.date))
  if (!data.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval={Math.floor(data.length / 8)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} />
        <Tooltip {...TOOLTIP} />
        <Line type="monotone" dataKey="cpi" stroke="#ff9f0a" dot={false} strokeWidth={1.5} name="CPI" connectNulls />
        <Line type="monotone" dataKey="pce" stroke="#0a84ff" dot={false} strokeWidth={1.5} name="PCE" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

function UnemploymentChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval={Math.floor(data.length / 8)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => `${v}%`} />
        <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v}%`, 'Unemployment']} />
        <Line type="monotone" dataKey="value" stroke="#ff453a" dot={false} strokeWidth={1.5} name="Unemployment" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

function GdpChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet.</p>
  const changes = data.map((d, i) => ({
    date: d.date,
    change: i > 0 ? +(((d.value - data[i - 1].value) / data[i - 1].value) * 100).toFixed(2) : null,
  })).filter(d => d.change !== null)
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={changes} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval={Math.floor(changes.length / 8)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => `${v}%`} />
        <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v}%`, 'GDP QoQ']} />
        <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
        <Bar dataKey="change" radius={[2, 2, 0, 0]}>
          {changes.map((d, i) => (
            <Cell key={i} fill={(d.change ?? 0) >= 0 ? '#30d158' : '#ff453a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function SentimentHistoryChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet — runs every 2 hours.</p>
  const formatted = data.map(d => {
    const dt = new Date(d.date)
    return { ...d, label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  })
  const every = Math.max(1, Math.floor(formatted.length / 10))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="label" tick={{ fill: '#636366', fontSize: 10 }} interval={every} />
        <YAxis domain={[-1, 1]} tick={{ fill: '#636366', fontSize: 10 }} />
        <Tooltip {...TOOLTIP} />
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
  markets: any; world: any; tech: any; macro: any; analysis: any
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
          {/* Global conviction */}
          {analysis?.global_conviction && (
            <ConvictionBanner label="Global Conviction" score={analysis.global_conviction.score} sublabel="Markets 50% · World 30% · Tech 20%" />
          )}

          {/* Macro strip */}
          {macro?.indicators && (
            <div className="grid grid-cols-5 gap-3">
              {macro.indicators.fed_funds   && <MacroStripCard label="Fed Funds"   value={macro.indicators.fed_funds.value}   change={macro.indicators.fed_funds.change}   unit="%" />}
              {macro.indicators.dgs10       && <MacroStripCard label="10Y"         value={macro.indicators.dgs10.value}       change={macro.indicators.dgs10.change}       unit="%" />}
              {macro.indicators.cpi         && <MacroStripCard label="Inflation"   value={macro.indicators.cpi.value}         change={macro.indicators.cpi.change}            />}
              {macro.indicators.unemployment && <MacroStripCard label="Unemploymt"  value={macro.indicators.unemployment.value} change={macro.indicators.unemployment.change} unit="%" />}
              {macro.indicators.gdp         && <MacroStripCard label="GDP"         value={macro.indicators.gdp.value}         change={macro.indicators.gdp.change}            />}
            </div>
          )}

          {/* Market / World / Tech banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {markets?.market_sentiment && <ConvictionBanner label="Markets" score={markets.market_sentiment.score} sublabel="Business & financial" />}
            {world?.world_sentiment    && <ConvictionBanner label="World"   score={world.world_sentiment.score}   sublabel="Geopolitical & general" />}
            {tech?.tech_sentiment      && <ConvictionBanner label="Tech"    score={tech.tech_sentiment.score}     sublabel="Technology sector" />}
          </div>

          {/* Top stories */}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Top Stories</p>
            <div className="bg-card border border-border rounded-xl p-4">
              {analysis?.top10?.length > 0
                ? <HeadlineFeed items={analysis.top10} />
                : <p className="text-sm text-muted py-2">Analysis agent is warming up — check back after the next run.</p>
              }
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

          {/* Summary + outlook */}
          {markets?.summary && (
            <SummaryCard data={markets.summary} />
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

          {/* Sector sentiment + catalysts */}
          {markets?.sectors && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sector Sentiment</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(markets.sectors).map(([sector, d]: [string, any]) => (
                  <div key={sector} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs text-muted">{sector}</p>
                        <p className="text-xs font-mono text-muted">{d.etf}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: sentimentColor(d.convictionScore) }}>{d.label}</p>
                        <p className="text-xs font-mono text-muted">{d.articles} articles</p>
                      </div>
                    </div>
                    <ScoreBar score={d.convictionScore} />
                    {(d.catalyst || d.risk) && (
                      <div className="mt-3 space-y-1">
                        {d.catalyst && <p className="text-xs text-green-400 flex gap-1.5"><span>↑</span>{d.catalyst}</p>}
                        {d.risk     && <p className="text-xs text-red-400   flex gap-1.5"><span>↓</span>{d.risk}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Headlines */}
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
          {world?.summary && <SummaryCard data={world.summary} />}
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
          {tech?.summary && <SummaryCard data={tech.summary} />}
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
                return d ? <MacroCard key={key} label={key === 'cpi' ? 'Inflation (CPI)' : d.label} value={d.value} change={d.change} unit={key === 'unemployment' ? '%' : ''} /> : null
              })}
            </div>
          </div>
          {macro?.jobs && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Jobs · {macro.jobs.source}</p>
              <div className="grid grid-cols-2 gap-3">
                <MacroCard label={`Nonfarm Payrolls (${macro.jobs.period ?? ''})`} value={macro.jobs.nonfarm_payrolls ? macro.jobs.nonfarm_payrolls / 1000 : null} unit="K" />
                <MacroCard label="Unemployment Rate" value={macro.jobs.unemployment_rate} unit="%" />
              </div>
            </div>
          )}
          {macro?.gdp && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">GDP · {macro.gdp.source}</p>
              <MacroCard label={`Real GDP (${macro.gdp.period ?? ''})`} value={macro.gdp.value} unit="%" />
            </div>
          )}
          {macro?.inventories && Object.keys(macro.inventories).length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">EIA Inventories</p>
              <div className="grid grid-cols-2 gap-3">
                {macro.inventories.crude_inventory    && <MacroCard label="Crude Oil (Mbbl)"   value={macro.inventories.crude_inventory.value}   change={macro.inventories.crude_inventory.change}   />}
                {macro.inventories.gasoline_inventory && <MacroCard label="Gasoline (Mbbl)"    value={macro.inventories.gasoline_inventory.value} change={macro.inventories.gasoline_inventory.change} />}
              </div>
            </div>
          )}
          {macro?.history?.rates?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Rates History · 120 Days</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <RatesChart data={macro.history.rates} />
              </div>
            </div>
          )}
          {(macro?.history?.cpi?.length > 0 || macro?.history?.pce?.length > 0) && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Inflation History · 5 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <InflationChart cpi={macro.history.cpi ?? []} pce={macro.history.pce ?? []} />
              </div>
            </div>
          )}
          {macro?.history?.unemployment?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Unemployment Rate · 5 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <UnemploymentChart data={macro.history.unemployment} />
              </div>
            </div>
          )}
          {macro?.history?.gdp?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Real GDP Growth · 10 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <GdpChart data={macro.history.gdp} />
              </div>
            </div>
          )}
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

          {/* Structured brief */}
          {analysis?.brief && <BriefCard text={analysis.brief} />}

          {/* Sentiment history */}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sentiment History · 10 Weeks</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <SentimentHistoryChart data={analysis?.sentiment_history ?? []} />
            </div>
          </div>

          {/* Inflation chart */}
          {(macro?.history?.cpi?.length > 0 || macro?.history?.pce?.length > 0) && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Inflation · CPI & PCE · 5 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <InflationChart cpi={macro?.history?.cpi ?? []} pce={macro?.history?.pce ?? []} />
              </div>
            </div>
          )}

          {/* Unemployment chart */}
          {macro?.history?.unemployment?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Unemployment Rate · 5 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <UnemploymentChart data={macro.history.unemployment} />
              </div>
            </div>
          )}

          {/* GDP chart */}
          {macro?.history?.gdp?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Real GDP Growth · 10 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <GdpChart data={macro.history.gdp} />
              </div>
            </div>
          )}

          {/* Top 10 global stories */}
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
