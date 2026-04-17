// YouTube Data API v3
// Docs: https://developers.google.com/youtube/v3
// Free tier: 10,000 units/day

const BASE = 'https://www.googleapis.com/youtube/v3'
const KEY  = process.env.YOUTUBE_API_KEY

export interface ChannelStats {
  id:           string
  title:        string
  subscribers:  number
  views:        number
  videoCount:   number
  thumbnail:    string
}

export interface VideoItem {
  id:          string
  title:       string
  publishedAt: string
  views:       number
  likes:       number
  thumbnail:   string
  url:         string
}

/** Search for a channel by name and return the first match ID */
export async function findChannelId(name: string): Promise<string | null> {
  const url = `${BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(name)}&maxResults=1&key=${KEY}`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0]?.id?.channelId ?? null
}

/** Get channel statistics by channel ID */
export async function fetchChannelStats(channelId: string): Promise<ChannelStats | null> {
  const url = `${BASE}/channels?part=snippet,statistics&id=${channelId}&key=${KEY}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null
  return {
    id:          item.id,
    title:       item.snippet.title,
    subscribers: parseInt(item.statistics.subscriberCount ?? '0'),
    views:       parseInt(item.statistics.viewCount ?? '0'),
    videoCount:  parseInt(item.statistics.videoCount ?? '0'),
    thumbnail:   item.snippet.thumbnails?.default?.url ?? '',
  }
}

/** Get recent videos for a channel */
export async function fetchRecentVideos(channelId: string, maxResults = 5): Promise<VideoItem[]> {
  // Step 1: get video IDs
  const searchUrl = `${BASE}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${KEY}`
  const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } })
  if (!searchRes.ok) return []
  const searchData = await searchRes.json()
  const ids: string[] = searchData.items?.map((i: any) => i.id.videoId) ?? []
  if (!ids.length) return []

  // Step 2: get stats for each video
  const statsUrl = `${BASE}/videos?part=snippet,statistics&id=${ids.join(',')}&key=${KEY}`
  const statsRes = await fetch(statsUrl, { next: { revalidate: 3600 } })
  if (!statsRes.ok) return []
  const statsData = await statsRes.json()

  return statsData.items?.map((v: any) => ({
    id:          v.id,
    title:       v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    views:       parseInt(v.statistics.viewCount ?? '0'),
    likes:       parseInt(v.statistics.likeCount ?? '0'),
    thumbnail:   v.snippet.thumbnails?.medium?.url ?? '',
    url:         `https://youtube.com/watch?v=${v.id}`,
  })) ?? []
}

/** Convenience: search + stats in one call for "Lost River Fleet" */
export async function fetchBandYouTube() {
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID ?? null
  const id = CHANNEL_ID ?? await findChannelId('Lost River Fleet')
  if (!id) return { stats: null, videos: [] }
  const [stats, videos] = await Promise.all([
    fetchChannelStats(id),
    fetchRecentVideos(id),
  ])
  return { stats, videos }
}
