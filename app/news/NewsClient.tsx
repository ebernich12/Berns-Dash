'use client'

import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'

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
    { key: 'CONVICTION', border: '#636366', bg: 'rgba(99,99,102,0.08)' },
    { key: 'CATALYST',   border: '#bf5af2', bg: 'rgba(191,90,242,0.08)' },
    { key: 'MARKET',     border: '#0a84ff', bg: 'rgba(10,132,255,0.06)' },
    { key: 'MACRO',      border: '#30d158', bg: 'rgba(48,209,88,0.06)'  },
    { key: 'KEY RISK',   border: '#ff9f0a', bg: 'rgba(255,159,10,0.08)' },
    { key: 'POSITIONING',border: '#5ac8fa', bg: 'rgba(90,200,250,0.06)' },
  ]
  const parsed: { label: string; text: string; border: string; bg: string }[] = []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    const nextKeys = sections.slice(i + 1).map(n => n.key + ':').join('|')
    const pattern  = new RegExp(`${s.key}:\\s*([\\s\\S]*?)(?=${nextKeys}|$)`, 'i')
    const match    = text.match(pattern)
    if (match) parsed.push({ label: s.key, text: match[1].trim(), border: s.border, bg: s.bg })
  }
  if (!parsed.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Market Brief · Groq</p>
        <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    )
  }
  const conviction = parsed.find(s => s.label === 'CONVICTION')
  const convColor  = conviction ? (
    conviction.text.match(/BULL|RISK-ON/i) ? '#30d158' :
    conviction.text.match(/BEAR|RISK-OFF/i) ? '#ff453a' :
    conviction.text.match(/STAGFLATION/i) ? '#ff9f0a' : '#f5f5f7'
  ) : '#f5f5f7'
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
        <p className="text-xs text-muted font-mono uppercase tracking-widest">Market Brief · Groq</p>
        {conviction && <p className="text-xs font-bold font-mono" style={{ color: convColor }}>{conviction.text.split('—')[0].trim()}</p>}
      </div>
      <div className="divide-y divide-border">
        {parsed.map((s, i) => (
          <div key={i} className="flex gap-0" style={{ borderLeft: `3px solid ${s.border}`, background: s.bg }}>
            <div className="flex-1 px-4 py-3">
              <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: s.border }}>{s.label}</p>
              <p className="text-sm text-white leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
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
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(5)} interval={Math.floor(data.length / 6)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => `${v}%`} width={48} domain={['auto', 'auto']} />
        <Tooltip {...TOOLTIP} formatter={(v: any, name: any) => [`${v}%`, name]} />
        <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        {Object.entries(CHART_COLORS).map(([key, color]) => (
          <Line key={key} type="monotone" dataKey={key} stroke={color} dot={false} strokeWidth={1.5} name={key.replace(/_/g, ' ').toUpperCase()} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function InflationChart({ cpi, pce }: { cpi: any[]; pce: any[] }) {
  const cpiSorted = [...cpi].sort((a, b) => a.date.localeCompare(b.date))
  const pceSorted = [...pce].sort((a, b) => a.date.localeCompare(b.date))

  function yoy(series: { date: string; value: number }[]) {
    return series.map((d, i) => {
      const yearAgo = new Date(d.date)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      const target = yearAgo.toISOString().slice(0, 7)
      const prior  = series.find(p => p.date.slice(0, 7) === target)
      return { date: d.date, yoy: prior ? +((d.value / prior.value - 1) * 100).toFixed(2) : null }
    }).filter(d => d.yoy !== null)
  }

  const cpiYoY = yoy(cpiSorted)
  const pceYoY = yoy(pceSorted)

  const merged: Record<string, any> = {}
  for (const p of cpiYoY) merged[p.date] = { ...merged[p.date], date: p.date, cpi: p.yoy }
  for (const p of pceYoY) merged[p.date] = { ...merged[p.date], date: p.date, pce: p.yoy }
  const data = Object.values(merged).sort((a: any, b: any) => a.date.localeCompare(b.date))

  if (!data.length) return <p className="text-sm text-muted">No history yet.</p>
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval={Math.floor(data.length / 8)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => `${v.toFixed(1)}%`} width={48} domain={['auto', 'auto']} />
        <Tooltip {...TOOLTIP} formatter={(v: any, name: any) => [`${(+v).toFixed(2)}%`, name]} />
        <ReferenceLine y={2} stroke="#636366" strokeDasharray="4 2" label={{ value: '2% target', fill: '#636366', fontSize: 9, position: 'insideTopLeft' }} />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        <Line type="monotone" dataKey="cpi" stroke="#ff9f0a" dot={false} strokeWidth={1.5} name="CPI YoY" connectNulls />
        <Line type="monotone" dataKey="pce" stroke="#0a84ff" dot={false} strokeWidth={1.5} name="PCE YoY" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

function UnemploymentChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet.</p>
  const vals = data.map(d => d.value).filter(Boolean)
  const min  = Math.floor(Math.min(...vals) * 10) / 10
  const max  = Math.ceil(Math.max(...vals)  * 10) / 10
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval={Math.floor(data.length / 8)} />
        <YAxis tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => `${v}%`} width={48} domain={[min - 0.2, max + 0.2]} />
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
  const vals = changes.map(d => d.change as number)
  const min  = Math.floor(Math.min(...vals) - 0.5)
  const max  = Math.ceil(Math.max(...vals)  + 0.5)
  const recent = changes[changes.length - 1]
  const prev   = changes[changes.length - 2]
  return (
    <div>
      {recent && (
        <div className="flex items-baseline gap-3 mb-4">
          <p className="text-3xl font-mono font-bold" style={{ color: (recent.change ?? 0) >= 0 ? '#30d158' : '#ff453a' }}>
            {(recent.change ?? 0) >= 0 ? '+' : ''}{recent.change}%
          </p>
          <p className="text-xs text-muted">QoQ · {recent.date.slice(0, 7)}</p>
          {prev && (
            <p className="text-xs text-muted ml-2">prev {prev.change}%</p>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={changes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
          <XAxis dataKey="date" tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={d => d.slice(0, 7)} interval={Math.floor(changes.length / 8)} />
          <YAxis tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => `${v}%`} width={48} domain={[min, max]} />
          <Tooltip {...TOOLTIP} formatter={(v: any) => [`${v}%`, 'GDP QoQ']} />
          <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
          <Bar dataKey="change" radius={[2, 2, 0, 0]}>
            {changes.map((d, i) => (
              <Cell key={i} fill={(d.change ?? 0) >= 0 ? '#30d158' : '#ff453a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SectorSentimentChart({ sectors }: { sectors: any }) {
  if (!sectors) return <p className="text-sm text-muted">No sector data.</p>
  const data = Object.entries(sectors)
    .map(([name, d]: [string, any]) => ({ name: (d as any).etf, fullName: name, score: (d as any).convictionScore }))
    .sort((a, b) => b.score - a.score)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" horizontal={false} />
        <XAxis type="number" domain={[-1, 1]} tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => v.toFixed(1)} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#8e8e93', fontSize: 11 }} width={36} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP} formatter={(v: any, _, props: any) => [Number(v).toFixed(3), props.payload.fullName]} />
        <ReferenceLine x={0} stroke="#3a3a3c" />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => <Cell key={i} fill={sentimentColor(d.score)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function GlobalSentimentChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted">No history yet — runs every 2 hours.</p>
  const formatted = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))
  const every = Math.max(1, Math.floor(formatted.length / 10))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
        <XAxis dataKey="label" tick={{ fill: '#636366', fontSize: 10 }} interval={every} />
        <YAxis domain={[-1, 1]} tick={{ fill: '#636366', fontSize: 10 }} tickFormatter={v => v.toFixed(1)} width={40} />
        <Tooltip {...TOOLTIP} formatter={(v: any, name: any) => [Number(v).toFixed(3), name]} />
        <ReferenceLine y={0} stroke="#3a3a3c" strokeDasharray="3 3" />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        <Line type="monotone" dataKey="markets" stroke="#0a84ff" dot={false} strokeWidth={2} name="US Markets" connectNulls />
        <Line type="monotone" dataKey="world"   stroke="#ff9f0a" dot={false} strokeWidth={2} name="World / Intl" connectNulls />
        <Line type="monotone" dataKey="tech"    stroke="#30d158" dot={false} strokeWidth={1.5} name="Tech" connectNulls />
        <Line type="monotone" dataKey="global"  stroke="#f5f5f7" dot={false} strokeWidth={2} name="Global" connectNulls strokeDasharray="4 2" />
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
          {analysis?.global_conviction && (
            <ConvictionBanner label="Global Conviction" score={analysis.global_conviction.score} sublabel="Markets 50% · World 30% · Tech 20%" />
          )}

          {/* Single combined brief */}
          {analysis?.brief && <BriefCard text={analysis.brief} />}

          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Top Stories</p>
            <div className="bg-card border border-border rounded-xl p-4">
              {analysis?.top10?.length > 0
                ? <HeadlineFeed items={analysis.top10} />
                : <p className="text-sm text-muted py-2">Analysis agent is warming up — check back after the next run.</p>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── MARKETS ───────────────────────────────────────────────── */}
      {tab === 'markets' && (
        <div className="space-y-6">
          {markets?.market_sentiment && (
            <ConvictionBanner label="Market Conviction" score={markets.market_sentiment.score} sublabel="Reuters · WSJ · FT · Finnhub · NewsAPI" />
          )}
          {markets?.summary && <SummaryCard data={markets.summary} />}

          {/* Sector sentiment — compact with one-line catalyst/risk */}
          {markets?.sectors && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Sector Sentiment</p>
              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                {Object.entries(markets.sectors).map(([sector, d]: [string, any]) => (
                  <div key={sector} className="flex items-start justify-between gap-4 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <p className="text-xs font-mono text-muted w-8 flex-shrink-0">{d.etf}</p>
                      <div className="min-w-0">
                        <p className="text-xs text-white font-medium">{sector}</p>
                        {(d.catalyst || d.risk) && (
                          <p className="text-xs text-muted truncate mt-0.5">{d.catalyst ?? d.risk}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-semibold flex-shrink-0" style={{ color: sentimentColor(d.convictionScore) }}>{d.label}</p>
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
          {macro?.analysis && <SummaryCard data={macro.analysis} />}

          {/* Key indicators */}
          {macro?.indicators && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {macro.indicators.fed_funds    && <MacroStripCard label="Fed Funds"  value={macro.indicators.fed_funds.value}    change={macro.indicators.fed_funds.change}    unit="%" />}
              {macro.indicators.dgs10        && <MacroStripCard label="10Y"        value={macro.indicators.dgs10.value}        change={macro.indicators.dgs10.change}        unit="%" />}
              {macro.indicators.t10y2y       && <MacroStripCard label="10Y-2Y"     value={macro.indicators.t10y2y.value}       change={macro.indicators.t10y2y.change}       unit="%" />}
              {macro.indicators.unemployment && <MacroStripCard label="Unemploymt" value={macro.indicators.unemployment.value} change={macro.indicators.unemployment.change} unit="%" />}
              {macro.jobs?.nonfarm_payrolls  && <MacroStripCard label="NFP"        value={Math.round(macro.jobs.nonfarm_payrolls / 1000)} unit="K" />}
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
          {macro?.history?.gdp?.length > 0 && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Real GDP Growth · 10 Years</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <GdpChart data={macro.history.gdp} />
              </div>
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

          {/* US Sector conviction bar */}
          {markets?.sectors && (
            <div>
              <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">US Sector Conviction</p>
              <div className="bg-card border border-border rounded-xl p-4">
                <SectorSentimentChart sectors={markets.sectors} />
              </div>
            </div>
          )}

          {/* Market brief */}
          {analysis?.brief && <BriefCard text={analysis.brief} />}

          {/* US vs World sentiment history */}
          <div>
            <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">US Markets vs World Sentiment</p>
            <div className="bg-card border border-border rounded-xl p-4">
              <GlobalSentimentChart data={analysis?.sentiment_history ?? []} />
            </div>
          </div>

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
