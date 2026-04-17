const http = require('http')
const { exec } = require('child_process')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

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

function saveRefreshToken(token) {
  let content = readFileSync(ENV_PATH, 'utf-8')
  if (content.includes('GOOGLE_REFRESH_TOKEN=')) {
    content = content.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${token}`)
  } else {
    content += `\nGOOGLE_REFRESH_TOKEN=${token}\n`
  }
  writeFileSync(ENV_PATH, content, 'utf-8')
}

const env = loadEnv(ENV_PATH)
const CLIENT_ID     = env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:3001/callback'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env.local')
  process.exit(1)
}

const params = new URLSearchParams({
  client_id:     CLIENT_ID,
  redirect_uri:  REDIRECT_URI,
  response_type: 'code',
  scope:         'https://www.googleapis.com/auth/calendar.readonly',
  access_type:   'offline',
  prompt:        'consent',
})

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3001')
  if (url.pathname !== '/callback') { res.end('Not found'); return }

  const code = url.searchParams.get('code')
  if (!code) { res.end('No code'); return }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }).toString(),
  })

  const tokens = await tokenRes.json()

  if (!tokens.refresh_token) {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2>No refresh token — revoke access at myaccount.google.com/permissions and re-run.</h2>')
    server.close()
    return
  }

  saveRefreshToken(tokens.refresh_token)

  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#0c0c0e;color:#fff">
    <h2 style="color:#8b5cf6">Google Calendar connected!</h2>
    <p>Refresh token saved to .env.local</p>
    <p style="color:#888">Now add GOOGLE_REFRESH_TOKEN to Vercel env vars and redeploy.</p>
  </body></html>`)

  console.log('\nRefresh token saved to .env.local')
  console.log('Next: add GOOGLE_REFRESH_TOKEN to Vercel, then redeploy.\n')
  server.close()
})

server.listen(3001, () => {
  console.log('Opening browser for Google authorization...')
  exec(`start "" "${authUrl}"`)
  console.log('If browser did not open, visit:\n' + authUrl)
})
