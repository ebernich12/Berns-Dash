'use client'

import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface HistoryRow {
  date: string
  yt_subscribers: number | null
  yt_total_views: number | null
  ig_followers: number | null
  ig_total_reach: number | null
  ig_impressions: number | null
  tiktok_followers: number | null
}

interface Props {
  history: HistoryRow[]
  yt: any
  ig: any
}

export const YT_COLOR = '#ff3b30'
export const IG_COLOR = '#ff2d78'
export const TT_COLOR = '#5ac8fa'

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1c1c1e',
  border: '1px solid #2c2c2e',
  borderRadius: '8px',
  color: '#f5f5f7',
  fontSize: '12px',
}

export default function MusicCharts({ history, yt, ig }: Props) {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))

  const followerData = sorted.map(r => ({
    date: r.date.slice(5),
    YouTube: r.yt_subscribers,
    Instagram: r.ig_followers,
    TikTok: r.tiktok_followers,
  }))

  const pieData = [
    { name: 'YouTube', value: yt?.subscribers ?? 0, color: YT_COLOR },
    { name: 'Instagram', value: ig?.followers ?? 0, color: IG_COLOR },
    { name: 'TikTok', value: 0, color: TT_COLOR },
  ].filter(d => d.value > 0)

  const totalFollowers = pieData.reduce((s, d) => s + d.value, 0)

  const reachData = sorted
    .filter(r => r.ig_impressions != null || r.ig_total_reach != null)
    .map(r => ({
      date: r.date.slice(5),
      'IG Reach (30d)': r.ig_impressions ?? r.ig_total_reach,
    }))

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pie chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">Total Followers</p>
          <p className="text-2xl font-semibold text-white mb-4">{fmt(totalFollowers)}</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: any) => [fmt(v), 'Followers']}
              />
              <Legend
                formatter={(value) => <span style={{ fontSize: 11, color: '#8e8e93' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Follower growth over time */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-4">Follower Growth</p>
          {followerData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={followerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fill: '#8e8e93', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7' }} formatter={(v: any) => [fmt(v)]} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="right" type="monotone" dataKey="YouTube" stroke={YT_COLOR} strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="Instagram" stroke={IG_COLOR} strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="TikTok" stroke={TT_COLOR} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-muted mt-8 text-center">Run agent daily to build trend data.</p>
          )}
        </div>
      </div>

      {/* IG Reach history */}
      {reachData.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-4">Instagram Reach History (30d window)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={reachData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
              <XAxis dataKey="date" tick={{ fill: '#8e8e93', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7' }} formatter={(v: any) => [fmt(v)]} />
              <Line type="monotone" dataKey="IG Reach (30d)" stroke={IG_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  )
}
