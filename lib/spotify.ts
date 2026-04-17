// Spotify Web API — Client Credentials flow (public data only)
// Docs: https://developer.spotify.com/documentation/web-api
// Note: Client Credentials cannot access user/artist stream counts.
//       For monthly listeners, streams, demographic data → Spotify for Artists scraper needed.

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''

let _token: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  if (_token && Date.now() < _tokenExpiry) return _token

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      Authorization:   `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  _token       = data.access_token
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return _token
}

export interface SpotifyArtist {
  id:         string
  name:       string
  followers:  number
  popularity: number  // 0–100
  genres:     string[]
  imageUrl:   string
  spotifyUrl: string
}

export interface SpotifyTrack {
  id:         string
  name:       string
  popularity: number
  album:      string
  releaseDate: string
  previewUrl: string | null
  spotifyUrl: string
}

/** Search for an artist by name */
export async function searchArtist(name: string): Promise<SpotifyArtist | null> {
  const token = await getToken()
  if (!token) return null
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
  )
  if (!res.ok) return null
  const data  = await res.json()
  const a     = data.artists?.items?.[0]
  if (!a) return null
  return {
    id:         a.id,
    name:       a.name,
    followers:  a.followers?.total ?? 0,
    popularity: a.popularity ?? 0,
    genres:     a.genres ?? [],
    imageUrl:   a.images?.[0]?.url ?? '',
    spotifyUrl: a.external_urls?.spotify ?? '',
  }
}

/** Get top tracks for an artist (public data) */
export async function fetchTopTracks(artistId: string, market = 'US'): Promise<SpotifyTrack[]> {
  const token = await getToken()
  if (!token) return []
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.tracks ?? []).map((t: any) => ({
    id:          t.id,
    name:        t.name,
    popularity:  t.popularity,
    album:       t.album?.name ?? '',
    releaseDate: t.album?.release_date ?? '',
    previewUrl:  t.preview_url,
    spotifyUrl:  t.external_urls?.spotify ?? '',
  }))
}

/** Convenience: search + top tracks for Lost River Fleet */
export async function fetchBandSpotify() {
  const artist = await searchArtist('Lost River Fleet')
  if (!artist) return { artist: null, tracks: [] }
  const tracks = await fetchTopTracks(artist.id)
  return { artist, tracks }
}
