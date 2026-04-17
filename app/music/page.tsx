import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import FollowersPieChart from '@/components/FollowersPieChart'
import fs from 'fs'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function relativeDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30)  return `${diff}d ago`
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
  return `${Math.floor(diff / 365)}y ago`
}

function loadBertrand() {
  try {
    const raw = fs.readFileSync(
      'C:\\Users\\ethan\\OneDrive\\Claude Code Projects\\Bertrand\\data\\latest.json',
      'utf-8'
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function MusicPage() {
  const data = loadBertrand()

  const yt  = data?.youtube
  const ig  = data?.instagram
  const tt  = data?.tiktok
  const am  = data?.apple_music
  const wp  = data?.wordpress
  const ts  = data?.timestamp ? new Date(data.timestamp) : null

  const ttFollowers = parseInt((tt?.followers ?? '0').toString().replace(/\D/g, '')) || 0
  const igFollowers = parseInt((ig?.followers ?? '0').toString().replace(/\D/g, '')) || 0
  const ytSubs      = yt?.subscribers ?? 0

  return (
    <div>
      <PageHeader
        title="Music"
        subtitle={ts ? `Lost River Fleet · updated ${relativeDate(ts.toISOString())}` : 'Lost River Fleet'}
      />

      {/* Top stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-2">YouTube</p>
          <p className="text-2xl font-semibold text-white">{ytSubs ? fmt(ytSubs) : '—'}</p>
          <p className="text-xs text-dim mt-1">{yt ? `${fmt(yt.total_views)} views · ${yt.video_count} videos` : 'No data'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-2">Instagram</p>
          <p className="text-2xl font-semibold text-white">{igFollowers ? fmt(igFollowers) : '—'}</p>
          <p className="text-xs text-dim mt-1">{ig?.posts ?? 'No data'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-2">TikTok</p>
          <p className="text-2xl font-semibold text-white">{ttFollowers ? fmt(ttFollowers) : '—'}</p>
          <p className="text-xs text-dim mt-1">{tt?.total_likes ? `${tt.total_likes} total likes` : 'No data'}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted mb-2">Apple Music</p>
          <p className="text-2xl font-semibold text-white">{am?.recent_tracks?.length ?? '—'}</p>
          <p className="text-xs text-dim mt-1">{am?.genre ?? 'tracks'}</p>
        </div>
      </div>

      {/* Followers pie + YouTube videos */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card title="Followers by Platform">
          <FollowersPieChart />
        </Card>

        <Card title="YouTube — Recent Videos" className="col-span-2">
          {yt?.recent_videos?.length > 0 ? (
            <div className="space-y-2">
              {yt.recent_videos.slice(0, 6).map((v: any, i: number) => (
                <div key={i} className="flex justify-between items-start border-b border-border pb-2 last:border-0">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm text-white truncate">{v.title}</p>
                    <p className="text-xs text-dim mt-0.5">{relativeDate(v.published)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-mono text-white">{fmt(v.views)}</p>
                    <p className="text-xs text-dim">{v.likes} likes</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">No video data — run Bertrand.</p>
          )}
        </Card>
      </div>

      {/* Apple Music + WordPress */}
      <div className="grid grid-cols-2 gap-6">
        <Card title="Apple Music — Releases">
          {am?.recent_tracks?.length > 0 ? (
            <div className="space-y-2">
              {am.recent_tracks.map((t: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-sm text-white">{t.title}</p>
                    <p className="text-xs text-dim">{t.album}</p>
                  </div>
                  <p className="text-xs text-dim flex-shrink-0 ml-4">{t.release_date}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">No data — run Bertrand.</p>
          )}
        </Card>

        <Card title="Website — WordPress">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted mb-2">Published</p>
              {wp?.published_posts?.length > 0 ? wp.published_posts.map((p: any, i: number) => (
                <a key={i} href={p.link} target="_blank" rel="noopener noreferrer"
                  className="block text-sm text-white hover:text-accent transition-colors mb-1">
                  {p.title} <span className="text-dim text-xs">({p.date})</span>
                </a>
              )) : <p className="text-sm text-dim">No posts yet.</p>}
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted mb-2">Pages</p>
              <div className="flex gap-2 flex-wrap">
                {wp?.pages?.map((p: string) => (
                  <span key={p} className="text-xs bg-border text-dim px-2 py-1 rounded">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
