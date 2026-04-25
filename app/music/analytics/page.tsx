import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { getSnapshot } from '@/lib/db'
import { fmtDateTimeET, fmtDateET } from '@/lib/time'
import AnalyticsCharts from './AnalyticsCharts'

export const dynamic = 'force-dynamic'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString()
}

const YT = '#ff3b30'
const IG = '#ff2d78'
const TT = '#5ac8fa'

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

export default async function AnalyticsPage() {
  const data = await getSnapshot('music')
  const yt = data?.youtube
  const ig = data?.instagram
  const history = data?.history ?? []
  const ts = data?.updated_at

  const igInsights = ig?.account_insights ?? {}

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Link href="/music" className="text-xs text-muted hover:text-white">← Music</Link>
      </div>
      <PageHeader
        title="Music Analytics"
        subtitle={ts ? `Updated ${fmtDateTimeET(ts)} ET` : 'No data'}
      />

      {/* Row 1: Total views / reach */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatCard label="YT Total Views" value={fmt(yt?.total_views)} color={YT} />
        <StatCard label="IG Total Reach (30 days)" value={fmt(ig?.account_insights?.reach ?? ig?.total_reach_recent)} color={IG} />
        <StatCard label="TikTok Total Views" value="—" color={TT} />
      </div>

      {/* Row 2: Avg views / video */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatCard label="YT Avg Views / Video" value={fmt(yt?.avg_views_per_video)} color={YT} />
        <StatCard label="IG Avg Reach / Post" value={fmt(ig?.total_reach_recent != null && ig?.post_count ? Math.round(ig.total_reach_recent / Math.min(ig.post_count, 20)) : null)} color={IG} />
        <StatCard label="TikTok Avg Views / Video" value="—" color={TT} />
      </div>

      {/* Row 3: Likes per video/post */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <StatCard label="YT Avg Likes / Video" value={fmt(yt?.videos?.length ? Math.round(yt.videos.reduce((s: number, v: any) => s + v.likes, 0) / yt.videos.length) : null)} color={YT} />
        <StatCard label="IG Avg Likes / Post" value={fmt(ig?.avg_likes_per_post)} color={IG} />
        <StatCard label="TikTok Avg Likes / Video" value="—" color={TT} />
      </div>

      {/* Row 4: Comments per video/post */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="YT Avg Comments / Video" value={fmt(yt?.avg_comments_per_video)} color={YT} />
        <StatCard label="IG Avg Comments / Post" value={fmt(ig?.avg_comments_per_post)} color={IG} />
        <StatCard label="TikTok Avg Comments / Video" value="—" color={TT} />
      </div>


      {/* Charts */}
      <AnalyticsCharts history={history} yt={yt} ig={ig} />

      {/* Instagram post breakdown */}
      {ig?.posts?.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: IG }}>Instagram Post Breakdown</p>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-border">
                    <th className="text-left pb-2 font-normal">Date</th>
                    <th className="text-right pb-2 font-normal">Likes</th>
                    <th className="text-right pb-2 font-normal">Comments</th>
                    <th className="text-right pb-2 font-normal">Reach</th>
                    <th className="text-right pb-2 font-normal">Saves</th>
                  </tr>
                </thead>
                <tbody>
                  {ig.posts.map((p: any) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 text-muted">{fmtDateET(p.timestamp)}</td>
                      <td className="py-2 text-right text-white">{fmt(p.likes)}</td>
                      <td className="py-2 text-right text-white">{fmt(p.comments)}</td>
                      <td className="py-2 text-right text-white">{fmt(p.reach)}</td>
                      <td className="py-2 text-right text-white">{fmt(p.saved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* YouTube video breakdown */}
      {yt?.videos?.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: YT }}>YouTube Video Breakdown</p>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-border">
                    <th className="text-left pb-2 font-normal">Video</th>
                    <th className="text-right pb-2 font-normal">Views</th>
                    <th className="text-right pb-2 font-normal">Likes</th>
                    <th className="text-right pb-2 font-normal">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {yt.videos.map((v: any) => (
                    <tr key={v.id} className="border-b border-border last:border-0">
                      <td className="py-2">
                        <a href={v.url} target="_blank" rel="noopener" className="text-accent hover:underline truncate block max-w-xs">
                          {v.title}
                        </a>
                        <span className="text-muted">{fmtDateET(v.published_at)}</span>
                      </td>
                      <td className="py-2 text-right text-white">{fmt(v.views)}</td>
                      <td className="py-2 text-right text-white">{fmt(v.likes)}</td>
                      <td className="py-2 text-right text-white">{fmt(v.comments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
