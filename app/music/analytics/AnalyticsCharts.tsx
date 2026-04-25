'use client'

import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const YT_COLOR = '#ff3b30'
const IG_COLOR = '#ff2d78'
const TT_COLOR = '#5ac8fa'

interface HistoryRow {
  date: string
  yt_subscribers: number | null
  yt_total_views: number | null
  yt_avg_views_per_video: number | null
  ig_followers: number | null
  ig_total_reach: number | null
  ig_impressions: number | null
  tiktok_followers: number | null
  tiktok_avg_views: number | null
}

interface Props {
  history: HistoryRow[]
  yt: any
  ig: any
}

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

export default function AnalyticsCharts({ history, yt, ig }: Props) {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))

  const followerData = sorted.map(r => ({
    date: r.date.slice(5),
    YouTube: r.yt_subscribers,
    Instagram: r.ig_followers,
    TikTok: r.tiktok_followers,
  }))

  const avgViewsData = sorted.map(r => ({
    date: r.date.slice(5),
    YouTube: r.yt_avg_views_per_video,
    Instagram: r.ig_impressions ?? r.ig_total_reach,
    TikTok: r.tiktok_avg_views,
  }))

  const reachData = sorted.map(r => ({
    date: r.date.slice(5),
    'IG Reach': r.ig_impressions ?? r.ig_total_reach,
    'YT Total Views': r.yt_total_views,
    TikTok: r.tiktok_avg_views,
  }))

  const platformBar = [
    { platform: 'YouTube',   value: yt?.total_views ?? 0,                                          color: YT_COLOR, label: 'Total Views' },
    { platform: 'Instagram', value: ig?.account_insights?.reach ?? ig?.total_reach_recent ?? 0,    color: IG_COLOR, label: 'Reach (30d)' },
    { platform: 'TikTok',   value: 0,                                                              color: TT_COLOR, label: 'Total Views' },
  ]

  return (
    <div className="space-y-4 mb-6">
      {/* Followers over time */}
      {followerData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-4">Followers Over Time</p>
          <ResponsiveContainer width="100%" height={220}>
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
        </div>
      )}

      {/* Avg views per video comparison */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-4">Total Views & Reach by Platform</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={platformBar} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
            <XAxis dataKey="platform" tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7' }} formatter={(v: any, _: any, props: any) => [fmt(v), props.payload.label]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {platformBar.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Avg views per video over time */}
      {avgViewsData.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-4">Views & Reach Over Time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={avgViewsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
              <XAxis dataKey="date" tick={{ fill: '#8e8e93', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7' }} formatter={(v: any) => [fmt(v)]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey="YouTube" stroke={YT_COLOR} strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="Instagram" stroke={IG_COLOR} strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="TikTok" stroke={TT_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Total reach / views over time */}
      {reachData.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-4">Total Reach & Views Over Time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={reachData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
              <XAxis dataKey="date" tick={{ fill: '#8e8e93', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={fmt} tick={{ fill: '#8e8e93', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#f5f5f7' }} itemStyle={{ color: '#f5f5f7' }} formatter={(v: any) => [fmt(v)]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="right" type="monotone" dataKey="IG Reach" stroke={IG_COLOR} strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="YT Total Views" stroke={YT_COLOR} strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="TikTok" stroke={TT_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
