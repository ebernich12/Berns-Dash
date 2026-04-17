// WordPress REST API client for Lost River Fleet
// Docs: https://developer.wordpress.com/docs/api/
// Auth: Application Password (basic auth)

const WP_BASE = process.env.WP_BASE_URL ?? ''
const WP_USER = process.env.WP_USERNAME  ?? ''
const WP_PASS = process.env.WP_APP_PASSWORD?.replace(/\s/g, '') ?? '' // strip spaces

function authHeader() {
  const encoded = Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')
  return { Authorization: `Basic ${encoded}` }
}

export interface WPPost {
  id:             number
  title:          string
  excerpt:        string
  link:           string
  date:           string
  status:         string
  featuredImage?: string
}

export interface WPSiteInfo {
  name:        string
  description: string
  url:         string
}

/** Fetch recent posts */
export async function fetchPosts(perPage = 5): Promise<WPPost[]> {
  if (!WP_BASE) return []
  const url = `${WP_BASE}/wp-json/wp/v2/posts?per_page=${perPage}&_fields=id,title,excerpt,link,date,status`
  const res = await fetch(url, {
    headers: authHeader(),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const posts = await res.json()
  return posts.map((p: any) => ({
    id:      p.id,
    title:   p.title?.rendered ?? '',
    excerpt: p.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() ?? '',
    link:    p.link,
    date:    p.date,
    status:  p.status,
  }))
}

/** Fetch site metadata */
export async function fetchSiteInfo(): Promise<WPSiteInfo | null> {
  if (!WP_BASE) return null
  const url = `${WP_BASE}/wp-json`
  const res = await fetch(url, {
    headers: authHeader(),
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  return {
    name:        data.name        ?? '',
    description: data.description ?? '',
    url:         data.url         ?? WP_BASE,
  }
}

/** Fetch pages */
export async function fetchPages(perPage = 10): Promise<WPPost[]> {
  if (!WP_BASE) return []
  const url = `${WP_BASE}/wp-json/wp/v2/pages?per_page=${perPage}&_fields=id,title,link,date,status`
  const res = await fetch(url, {
    headers: authHeader(),
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const pages = await res.json()
  return pages.map((p: any) => ({
    id:      p.id,
    title:   p.title?.rendered ?? '',
    excerpt: '',
    link:    p.link,
    date:    p.date,
    status:  p.status,
  }))
}
