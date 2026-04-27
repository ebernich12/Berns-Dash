/**
 * Run once to get YouTube refresh token for the band account (lostrivernh@gmail.com).
 * Usage: node scripts/get-youtube-token.mjs
 *
 * Log in as lostrivernh@gmail.com when the browser opens.
 * Saves YOUTUBE_REFRESH_TOKEN to .env.local automatically.
 */

import http from 'http'
import { exec } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { URL } from 'url'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH  = path.join(__dirname, '..', '.env.local')

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

function saveToken(filePath, token) {
  let content = readFileSync(filePath, 'utf-8')
  if (content.includes('YOUTUBE_REFRESH_TOKEN=')) {
    content = content.replace(/^YOUTUBE_REFRESH_TOKEN=.*$/m, `YOUTUBE_REFRESH_TOKEN=${token}`)
  } else {
    content += `\nYOUTUBE_REFRESH_TOKEN=${token}\n`
  }
  writeFileSync(filePath, content, 'utf-8')
}

const env = loadEnv(ENV_PATH)
const CLIENT_ID     = env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:3001/callback'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local')
  process.exit(1)
}

const params = new URLSearchParams({
  client_id:     CLIENT_ID,
  redirect_uri:  REDIRECT_URI,
  response_type: 'code',
  scope:         'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
  access_type:   'offline',
  prompt:        'consent',
  login_hint:    'lostrivernh@gmail.com',
})

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:3001')
  if (reqUrl.pathname !== '/callback') { res.end('Not found'); return }

  const code = reqUrl.searchParams.get('code')
  if (!code) { res.end('No code received'); return }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.refresh_token) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2>❌ No refresh token. Revoke access at myaccount.google.com/permissions and re-run.</h2>')
    server.close()
    return
  }

  saveToken(ENV_PATH, tokens.refresh_token)

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`
    <html><body style="font-family:sans-serif;padding:40px;background:#0c0c0e;color:#fff">
      <h2 style="color:#8b5cf6">✅ YouTube connected!</h2>
      <p>Refresh token saved to .env.local as YOUTUBE_REFRESH_TOKEN</p>
      <p style="color:#888">Next: add YOUTUBE_REFRESH_TOKEN to .env.local on Oracle server → pm2 restart berns-dashboard</p>
      <p style="color:#666">You can close this tab.</p>
    </body></html>
  `)

  console.log('\n✅  YOUTUBE_REFRESH_TOKEN saved to .env.local')
  console.log('   Next: copy to Oracle .env.local → pm2 restart berns-dashboard\n')
  server.close()
})

server.listen(3001, () => {
  console.log('Opening Google authorization page — log in as lostrivernh@gmail.com ...')
  const cmd = process.platform === 'win32' ? `start "" "${authUrl}"` : `open "${authUrl}"`
  exec(cmd)
  console.log('If browser did not open, visit:\n' + authUrl)
})
