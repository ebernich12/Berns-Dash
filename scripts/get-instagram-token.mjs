import http from 'http'
import { exec } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { URL } from 'url'
import path from 'path'
import { fileURLToPath } from 'url'

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

function saveToken(filePath, key, token) {
  let content = readFileSync(filePath, 'utf-8')
  const regex = new RegExp(`^${key}=.*$`, 'm')
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${token}`)
  } else {
    content += `\n${key}=${token}\n`
  }
  writeFileSync(filePath, content, 'utf-8')
}

const APP_ID = '1621248105765605'
const APP_SECRET = '649303d4af96ded12eb26dc28bb96c74'
const REDIRECT_URI = 'https://bernsapp.com/api/instagram/callback'

const params = new URLSearchParams({
  client_id: APP_ID,
  redirect_uri: REDIRECT_URI,
  scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement',
  response_type: 'code',
})

const authUrl = `https://www.facebook.com/v25.0/dialog/oauth?${params}`

console.log('\n=== Instagram / Facebook OAuth ===')
console.log('Opening browser — log in as lostrivernh@gmail.com...')
console.log('\nAuth URL:\n' + authUrl + '\n')

const cmd = process.platform === 'win32' ? `start "" "${authUrl}"` : `open "${authUrl}"`
exec(cmd)

console.log('After you authorize, copy the "code" from the redirect URL and paste it here.')
console.log('The redirect will fail (bernsapp.com/api/instagram/callback not live yet) —')
console.log('just copy the full URL from your browser address bar and paste it below.\n')

process.stdout.write('Paste the full redirect URL: ')

process.stdin.setEncoding('utf-8')
process.stdin.once('data', async (input) => {
  const redirectUrl = input.trim()
  let code
  try {
    const parsed = new URL(redirectUrl)
    code = parsed.searchParams.get('code')
  } catch {
    code = redirectUrl
  }

  if (!code) {
    console.error('Could not extract code from URL')
    process.exit(1)
  }

  console.log('\nExchanging code for token...')

  const tokenRes = await fetch(`https://graph.facebook.com/v25.0/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }),
  })

  const tokens = await tokenRes.json()
  if (tokens.error) {
    console.error('Error:', JSON.stringify(tokens.error, null, 2))
    process.exit(1)
  }

  const shortToken = tokens.access_token
  console.log('Short-lived token:', shortToken.slice(0, 20) + '...')

  // Exchange for long-lived token
  const longRes = await fetch(
    `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`
  )
  const longTokenData = await longRes.json()

  if (longTokenData.error) {
    console.error('Long-lived token error:', JSON.stringify(longTokenData.error, null, 2))
    process.exit(1)
  }

  const longToken = longTokenData.access_token
  saveToken(ENV_PATH, 'INSTAGRAM_ACCESS_TOKEN', longToken)
  console.log('\n✅ INSTAGRAM_ACCESS_TOKEN saved to .env.local')
  console.log('   Expires in ~60 days. Run this script again to refresh.')
  console.log('   Next: copy to Oracle .env.local → pm2 restart berns-dashboard\n')
  process.exit(0)
})
