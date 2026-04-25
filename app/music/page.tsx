import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { getSnapshot } from '@/lib/db'
import { fmtDateTimeET, fmtDateET } from '@/lib/time'
import MusicCharts from './MusicCharts'

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

function SectionHeader({ label, color, href }: { label: string; color: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color }}>{label}</p>
      </div>
      {href && (
        <Link href={href} className="text-xs text-muted hover:text-white transition-colors">
          Deep Analytics →
        </Link>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-xl font-semibold" style={{ color }}>{value}</p>
    </div>
  )
}

export default async function MusicPage() {
  const data = await getSnapshot('music')
  const yt = data?.youtube
  const ig = data?.instagram
  const wp = data?.wordpress
  const history = data?.history ?? []
  const ts = data?.updated_at

  const ytVideos = yt?.videos?.slice(0, 5) ?? []
  const igPosts = ig?.posts?.slice(0, 5) ?? []

  return (
    <div>
      <div className="flex items-start justify-between">
        <PageHeader
          title="Music"
          subtitle={ts ? `Updated ${fmtDateTimeET(ts)} ET` : 'Waiting for MusicAgent'}
        />
        <Link
          href="/music/analytics"
          className="mt-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/10 text-white transition-colors"
        >
          Deep Analytics
        </Link>
      </div>

      {!data && (
        <p className="text-sm text-dim mt-4">No data yet — run music-agent.mjs to populate.</p>
      )}

      {/* Charts — followers pie + growth */}
      {data && (
        <MusicCharts history={history} yt={yt} ig={ig} />
      )}

      {/* ── YouTube ─────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="YouTube" color={YT} />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Subscribers" value={fmt(yt?.subscribers)} color={YT} />
          <StatCard label="Total Views" value={fmt(yt?.total_views)} color={YT} />
          <StatCard label="Avg Comments / Video" value={fmt(yt?.avg_comments_per_video)} color={YT} />
        </div>
        {ytVideos.length > 0 && (
          <Card title="Recent Videos">
            <div className="space-y-3">
              {ytVideos.map((v: any) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0 hover:bg-white/[0.02] rounded -mx-1 px-1 transition-colors group"
                >
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt="" className="w-20 h-12 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate group-hover:text-red-400 transition-colors">{v.title}</p>
                    <p className="text-xs text-muted mt-0.5">{fmtDateET(v.published_at)}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-muted">{fmt(v.views)} views</span>
                      <span className="text-xs text-muted">{fmt(v.likes)} likes</span>
                      <span className="text-xs text-muted">{fmt(v.comments)} comments</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Instagram ────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="Instagram" color={IG} />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Followers" value={fmt(ig?.followers)} color={IG} />
          <StatCard label="Impressions (30d)" value={fmt(ig?.account_insights?.impressions ?? ig?.account_insights?.reach)} color={IG} />
          <StatCard label="Avg Comments / Post" value={fmt(ig?.avg_comments_per_post)} color={IG} />
        </div>
        {igPosts.length > 0 && (
          <Card title="Recent Posts">
            <div className="space-y-3">
              {igPosts.map((p: any) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0 hover:bg-white/[0.02] rounded -mx-1 px-1 transition-colors group"
                >
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted">{fmtDateET(p.timestamp)} · {p.media_type}</p>
                    {p.caption && <p className="text-sm text-white mt-0.5 line-clamp-2 group-hover:text-pink-400 transition-colors">{p.caption}</p>}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted">{fmt(p.likes)} likes</span>
                      <span className="text-xs text-muted">{fmt(p.comments)} comments</span>
                      {p.reach != null && <span className="text-xs text-muted">{fmt(p.reach)} reach</span>}
                      {p.saved != null && <span className="text-xs text-muted">{fmt(p.saved)} saves</span>}
                      {p.video_views != null && <span className="text-xs text-muted">{fmt(p.video_views)} video views</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── TikTok ───────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="TikTok" color={TT} />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Followers" value="—" color={TT} />
          <StatCard label="Total Views" value="—" color={TT} />
          <StatCard label="Avg Comments / Video" value="—" color={TT} />
        </div>
        <p className="text-xs text-muted">Pending TikTok app approval.</p>
      </div>

      {/* ── WordPress ────────────────────────────────────────── */}
      <div className="mb-8">
        <SectionHeader label="Website · lostriverfleet.com" color="#8e8e93" />
        <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ height: '600px' }}>
          <iframe
            src="https://lostriverfleet.com"
            className="w-full h-full"
            title="Lost River Fleet"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  )
}
