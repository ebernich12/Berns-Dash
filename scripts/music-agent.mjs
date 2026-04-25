import { google } from 'googleapis'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(__dirname, '..', '.env.local')

function loadEnv(filePath) {
  const env = {}
  try {
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 0) continue
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  } catch {}
  return env
}

const env = loadEnv(ENV_PATH)

const INGEST_URL = env.INGEST_URL || 'https://bernsapp.com/api/ingest'
const CRON_SECRET = env.CRON_SECRET
const IG_TOKEN = env.INSTAGRAM_ACCESS_TOKEN
const IG_ACCOUNT_ID = env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841472937531980'

// ── YouTube ──────────────────────────────────────────────────────────────────

async function fetchYouTube() {
  const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN })
  const yt = google.youtube({ version: 'v3', auth })

  const channelRes = await yt.channels.list({ part: 'snippet,statistics', mine: true })
  const channel = channelRes.data.items?.[0]

  const videosRes = await yt.search.list({
    part: 'id',
    forMine: true,
    type: 'video',
    order: 'date',
    maxResults: 10,
  })
  const videoIds = videosRes.data.items?.map(i => i.id.videoId).filter(Boolean) ?? []

  let videos = []
  if (videoIds.length > 0) {
    const detailRes = await yt.videos.list({ part: 'snippet,statistics', id: videoIds.join(',') })
    videos = detailRes.data.items?.map(v => ({
      id: v.id,
      title: v.snippet.title,
      published_at: v.snippet.publishedAt,
      thumbnail: v.snippet.thumbnails?.medium?.url,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      views: parseInt(v.statistics.viewCount || '0'),
      likes: parseInt(v.statistics.likeCount || '0'),
      comments: parseInt(v.statistics.commentCount || '0'),
    })) ?? []
  }

  const totalComments = videos.reduce((s, v) => s + v.comments, 0)
  const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0
  const avgViews = videos.length > 0 ? Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length) : 0

  return {
    channel_name: channel?.snippet?.title,
    channel_id: channel?.id,
    subscribers: parseInt(channel?.statistics?.subscriberCount || '0'),
    total_views: parseInt(channel?.statistics?.viewCount || '0'),
    video_count: parseInt(channel?.statistics?.videoCount || '0'),
    avg_comments_per_video: avgComments,
    avg_views_per_video: avgViews,
    videos,
  }
}

// ── Instagram ────────────────────────────────────────────────────────────────

async function fetchInstagram() {
  const base = `https://graph.facebook.com/v25.0`

  const profileRes = await fetch(
    `${base}/${IG_ACCOUNT_ID}?fields=id,name,followers_count,follows_count,media_count,biography,username&access_token=${IG_TOKEN}`
  )
  const profile = await profileRes.json()

  const mediaRes = await fetch(
    `${base}/${IG_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink,thumbnail_url,media_url,insights.metric(impressions,reach,saved,video_views,plays,shares)&limit=20&access_token=${IG_TOKEN}`
  )
  const mediaData = await mediaRes.json()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const posts = mediaData.data?.map(p => {
    const insight = (name) => p.insights?.data?.find(i => i.name === name)?.values?.[0]?.value ?? null
    return {
      id: p.id,
      caption: p.caption?.slice(0, 120),
      media_type: p.media_type,
      timestamp: p.timestamp,
      url: p.permalink,
      thumbnail: p.thumbnail_url || (p.media_type === 'IMAGE' ? p.media_url : null),
      likes: p.like_count,
      comments: p.comments_count,
      impressions: insight('impressions'),
      reach: insight('reach'),
      saved: insight('saved'),
      video_views: insight('video_views'),
      plays: insight('plays'),
      shares: insight('shares'),
    }
  }) ?? []

  const recentPosts = posts.filter(p => new Date(p.timestamp) >= thirtyDaysAgo)
  const totalReach = recentPosts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const totalImpressions = recentPosts.reduce((s, p) => s + (p.impressions ?? 0), 0)
  const avgComments = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.comments ?? 0), 0) / posts.length) : 0
  const avgLikes = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.likes ?? 0), 0) / posts.length) : 0

  // Account-level insights (last 30 days)
  let accountInsights = {}
  try {
    const since = Math.floor(Date.now() / 1000) - 30 * 86400
    const until = Math.floor(Date.now() / 1000)
    const insightRes = await fetch(
      `${base}/${IG_ACCOUNT_ID}/insights?metric=impressions,reach,profile_views&period=day&since=${since}&until=${until}&access_token=${IG_TOKEN}`
    )
    const insightData = await insightRes.json()
    if (insightData.error) {
      console.warn('IG insights error:', insightData.error.message)
    }
    for (const metric of insightData.data ?? []) {
      const total = metric.values?.reduce((s, v) => s + v.value, 0) ?? 0
      accountInsights[metric.name] = total
    }
  } catch (e) {
    console.warn('IG insights failed:', e.message)
  }

  return {
    username: profile.username,
    followers: profile.followers_count,
    following: profile.follows_count,
    post_count: profile.media_count,
    bio: profile.biography,
    total_reach_recent: totalReach,
    total_impressions_recent: totalImpressions,
    avg_comments_per_post: avgComments,
    avg_likes_per_post: avgLikes,
    account_insights: accountInsights,
    posts,
  }
}

// ── WordPress ─────────────────────────────────────────────────────────────────

async function fetchWordPress() {
  const res = await fetch(
    'https://lostriverfleet.com/wp-json/wp/v2/posts?per_page=10&_fields=id,title,date,link,excerpt'
  )
  if (!res.ok) return { posts: [] }
  const data = await res.json()

  const posts = data.map(p => ({
    id: p.id,
    title: p.title?.rendered,
    date: p.date,
    link: p.link,
    excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, '').slice(0, 150),
  }))

  return { posts }
}

// ── History ───────────────────────────────────────────────────────────────────

async function saveHistory(ytData, igData) {
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS music_history (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        yt_subscribers INT,
        yt_total_views BIGINT,
        yt_avg_views_per_video INT,
        ig_followers INT,
        ig_total_reach BIGINT,
        ig_impressions BIGINT,
        tiktok_followers INT,
        tiktok_avg_views INT,
        UNIQUE(date)
      )
    `)
    await pool.query(`ALTER TABLE music_history ADD COLUMN IF NOT EXISTS ig_impressions BIGINT`)
    await pool.query(`
      INSERT INTO music_history (date, yt_subscribers, yt_total_views, yt_avg_views_per_video, ig_followers, ig_total_reach, ig_impressions)
      VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
      ON CONFLICT (date) DO UPDATE SET
        yt_subscribers = $1,
        yt_total_views = $2,
        yt_avg_views_per_video = $3,
        ig_followers = $4,
        ig_total_reach = $5,
        ig_impressions = $6
    `, [
      ytData?.subscribers ?? null,
      ytData?.total_views ?? null,
      ytData?.avg_views_per_video ?? null,
      igData?.followers ?? null,
      igData?.total_reach_recent ?? null,
      igData?.account_insights?.impressions ?? null,
    ])

    const histRes = await pool.query(`
      SELECT date, yt_subscribers, yt_total_views, yt_avg_views_per_video,
             ig_followers, ig_total_reach, ig_impressions, tiktok_followers, tiktok_avg_views
      FROM music_history
      ORDER BY date DESC
      LIMIT 90
    `)
    return histRes.rows.map(r => ({
      date: r.date.toISOString().slice(0, 10),
      yt_subscribers: r.yt_subscribers,
      yt_total_views: r.yt_total_views,
      yt_avg_views_per_video: r.yt_avg_views_per_video,
      ig_followers: r.ig_followers,
      ig_total_reach: r.ig_total_reach,
      ig_impressions: r.ig_impressions,
      tiktok_followers: r.tiktok_followers,
      tiktok_avg_views: r.tiktok_avg_views,
    }))
  } finally {
    await pool.end()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('MusicAgent: fetching data...')

  const [youtube, instagram, wordpress] = await Promise.allSettled([
    fetchYouTube(),
    fetchInstagram(),
    fetchWordPress(),
  ])

  const ytData = youtube.status === 'fulfilled' ? youtube.value : null
  const igData = instagram.status === 'fulfilled' ? instagram.value : null

  const history = await saveHistory(ytData, igData).catch(e => {
    console.error('History save failed:', e.message)
    return []
  })

  const summaryParts = []
  if (ytData) summaryParts.push(`YouTube: ${ytData.subscribers?.toLocaleString()} subs · ${ytData.total_views?.toLocaleString()} views`)
  if (igData) summaryParts.push(`Instagram: ${igData.followers?.toLocaleString()} followers`)

  const data = {
    updated_at: new Date().toISOString(),
    summary: summaryParts.join(' · '),
    youtube: ytData ?? { error: youtube.reason?.message },
    instagram: igData ?? { error: instagram.reason?.message },
    wordpress: wordpress.status === 'fulfilled' ? wordpress.value : { error: wordpress.reason?.message },
    history,
  }

  console.log('YouTube:', youtube.status, ytData ? `${ytData.subscribers} subs, avg ${ytData.avg_views_per_video} views/video` : youtube.reason?.message)
  console.log('Instagram:', instagram.status, igData ? `${igData.followers} followers, ${igData.avg_comments_per_post} avg comments` : instagram.reason?.message)
  console.log('WordPress:', wordpress.status, data.wordpress.posts?.length, 'posts')
  console.log('History rows:', history.length)

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ agent: 'music', data }),
  })

  const result = await res.json()
  console.log('Ingest result:', result)
}

run().catch(err => {
  console.error('MusicAgent error:', err)
  process.exit(1)
})
