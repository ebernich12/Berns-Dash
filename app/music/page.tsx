import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { fetchBandSpotify } from '@/lib/spotify'
import { fetchBandYouTube } from '@/lib/youtube'
import FollowersPieChart from '@/components/FollowersPieChart'

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

const hasYouTube  = !!process.env.YOUTUBE_API_KEY
const hasSpotify  = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
const hasTikTok   = !!process.env.TIKTOK_CLIENT_KEY
const hasMeta     = !!process.env.META_APP_SECRET

export default async function MusicPage() {
  const [spotifyResult, youtubeResult] = await Promise.allSettled([
    fetchBandSpotify(),
    fetchBandYouTube(),
  ])

  const spotify = spotifyResult.status === 'fulfilled' ? spotifyResult.value : { artist: null, tracks: [] }
  const youtube = youtubeResult.status === 'fulfilled' ? youtubeResult.value : { stats: null, videos: [] }

  return (
    <div>
      <PageHeader
        title="Music"
        subtitle="Lost River Fleet — streaming stats, social, releases"
      />

      {/* ── Platform followers/subscribers ──────────────────────────────── */}
      <p className="text-xs text-muted uppercase tracking-widest mb-3">Followers & Subscribers</p>
      <div className="grid grid-cols-4 gap-4 mb-6">

        {/* YouTube Subscribers */}
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">YouTube</p>
          <p className="text-xs text-muted mb-1">Subscribers</p>
          <p className="text-2xl font-bold text-white">
            {youtube.stats ? fmt(youtube.stats.subscribers) : '—'}
          </p>
          <p className={`text-xs mt-1 ${hasYouTube ? 'text-green' : 'text-muted'}`}>
            {hasYouTube ? 'Live' : 'No key'}
          </p>
        </Card>

        {/* Spotify Followers */}
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Spotify</p>
          <p className="text-xs text-muted mb-1">Followers</p>
          <p className="text-2xl font-bold text-white">
            {spotify.artist ? fmt(spotify.artist.followers) : '—'}
          </p>
          <p className={`text-xs mt-1 ${hasSpotify ? 'text-green' : 'text-muted'}`}>
            {hasSpotify ? `Pop. ${spotify.artist?.popularity ?? '—'}/100` : 'Add Client ID + Secret'}
          </p>
        </Card>

        {/* TikTok Followers */}
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">TikTok</p>
          <p className="text-xs text-muted mb-1">Followers</p>
          <p className="text-2xl font-bold text-white">—</p>
          <p className={`text-xs mt-1 ${hasTikTok ? 'text-yellow' : 'text-muted'}`}>
            {hasTikTok ? 'Needs OAuth flow' : 'No key'}
          </p>
        </Card>

        {/* Instagram Followers */}
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Instagram</p>
          <p className="text-xs text-muted mb-1">Followers</p>
          <p className="text-2xl font-bold text-white">—</p>
          <p className={`text-xs mt-1 ${hasMeta ? 'text-yellow' : 'text-muted'}`}>
            {hasMeta ? 'Needs OAuth flow' : 'Add Meta App Secret'}
          </p>
        </Card>
      </div>

      {/* ── Streaming stats row ──────────────────────────────────────────── */}
      <p className="text-xs text-muted uppercase tracking-widest mb-3">Streaming Stats</p>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">YT Total Views</p>
          <p className="text-2xl font-bold text-white">
            {youtube.stats ? fmt(youtube.stats.views) : '—'}
          </p>
          <p className="text-xs text-muted mt-1">
            {youtube.stats ? `${youtube.stats.videoCount} videos` : hasYouTube ? 'Not found' : 'No key'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Monthly Listeners</p>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-muted mt-1">Spotify for Artists scraper</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Spotify Popularity</p>
          <p className="text-2xl font-bold text-white">
            {spotify.artist ? `${spotify.artist.popularity}/100` : '—'}
          </p>
          <p className="text-xs text-muted mt-1">{hasSpotify ? 'Spotify index' : 'No key'}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Genres</p>
          <p className="text-sm font-bold text-white mt-1">
            {spotify.artist?.genres?.length
              ? spotify.artist.genres.slice(0, 2).join(', ')
              : '—'}
          </p>
          <p className="text-xs text-muted mt-1">{hasSpotify ? 'Spotify' : 'No key'}</p>
        </Card>
      </div>

      {/* ── Followers breakdown ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card title="Followers — Platform Breakdown" className="col-span-1">
          <FollowersPieChart />
        </Card>
        <Card title="Social Stats" className="col-span-2">
          <div className="grid grid-cols-3 gap-4 text-sm h-full">
            {[
              { label: 'TikTok Followers',    val: '1,028',  sub: '19.7K total likes'  },
              { label: 'Instagram Followers',  val: '894',    sub: '40 posts'            },
              { label: 'YouTube Subscribers',  val: '106',    sub: '31,977 total views'  },
            ].map(({ label, val, sub }) => (
              <div key={label} className="border border-border rounded p-4">
                <p className="text-xs text-muted uppercase tracking-widest mb-2">{label}</p>
                <p className="text-2xl font-bold text-white">{val}</p>
                <p className="text-xs text-muted mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Tracks + Videos ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card title="Spotify — Top Tracks">
          {spotify.tracks.length > 0 ? (
            <div className="space-y-2">
              {spotify.tracks.slice(0, 8).map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <a href={t.spotifyUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-white hover:text-accent truncate block">{t.name}</a>
                    <p className="text-xs text-muted truncate">{t.album} · {t.releaseDate?.slice(0, 4)}</p>
                  </div>
                  <span className="text-xs text-muted w-6 text-right">{t.popularity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">
              {hasSpotify ? 'No tracks found for Lost River Fleet.' : 'Add SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET to .env.local'}
            </p>
          )}
        </Card>

        <Card title="YouTube — Recent Videos">
          {youtube.videos.length > 0 ? (
            <div className="space-y-3">
              {youtube.videos.slice(0, 6).map((v) => (
                <div key={v.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <a href={v.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white hover:text-accent leading-snug block">{v.title}</a>
                  <p className="text-xs text-muted mt-0.5">
                    {fmt(v.views)} views · {v.likes > 0 ? `${fmt(v.likes)} likes · ` : ''}{relativeDate(v.publishedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">
              {hasYouTube ? 'No videos found — add YOUTUBE_CHANNEL_ID to .env.local for exact match.' : 'Add YOUTUBE_API_KEY to .env.local'}
            </p>
          )}
        </Card>
      </div>

      {/* ── Artist profile + API status ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        <Card title="Artist Profile">
          <div className="space-y-2 text-sm">
            {[
              { label: 'Band',     val: 'Lost River Fleet'                                   },
              { label: 'Role',     val: 'Guitar'                                             },
              { label: 'Spotify',  val: spotify.artist?.spotifyUrl ? '✓ Found' : hasSpotify ? 'Not found' : 'No keys' },
              { label: 'YouTube',  val: youtube.stats?.title ?? (hasYouTube ? 'Not found' : 'No key') },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted">{label}</span>
                <span className="text-white text-right max-w-[65%] truncate text-xs">{val}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Platform Status">
          <div className="space-y-2">
            {[
              { platform: 'YouTube',   connected: hasYouTube,  note: 'Subscribers + views'        },
              { platform: 'Spotify',   connected: hasSpotify,  note: 'Followers + top tracks'      },
              { platform: 'TikTok',    connected: hasTikTok,   note: 'Followers — OAuth needed'    },
              { platform: 'Instagram', connected: hasMeta,     note: 'Followers — OAuth needed'    },
              { platform: 'Monthly Listeners', connected: false, note: 'Spotify for Artists scraper' },
            ].map(({ platform, connected, note }) => (
              <div key={platform} className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white">{platform}</span>
                  <p className="text-xs text-muted">{note}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${connected ? 'bg-green/10 text-green' : 'bg-border text-muted'}`}>
                  {connected ? 'Connected' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
