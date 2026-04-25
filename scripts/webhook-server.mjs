import http from 'http'
import crypto from 'crypto'
import { exec } from 'child_process'
import { readFileSync } from 'fs'
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

const env    = loadEnv(ENV_PATH)
const SECRET = env.GITHUB_WEBHOOK_SECRET
const PORT   = 9001
const DIR    = '/home/ubuntu/dashboard'

function verify(payload, sig) {
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  } catch {
    return false
  }
}

function deploy() {
  console.log(`[${new Date().toISOString()}] deploying...`)
  exec(
    `cd ${DIR} && git pull origin master && npm ci && npm run build && pm2 restart berns-dashboard`,
    { timeout: 300_000 },
    (err, stdout, stderr) => {
      if (err) {
        console.error(`[${new Date().toISOString()}] deploy failed:`, err.message)
        if (stderr) console.error(stderr)
      } else {
        console.log(`[${new Date().toISOString()}] deploy complete`)
        if (stdout) console.log(stdout)
      }
    }
  )
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404).end()
    return
  }

  const chunks = []
  req.on('data', c => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const sig  = req.headers['x-hub-signature-256'] ?? ''

    if (!SECRET || !verify(body, sig)) {
      res.writeHead(401).end('unauthorized')
      return
    }

    const event = req.headers['x-github-event']
    if (event !== 'push') {
      res.writeHead(200).end('ignored')
      return
    }

    let payload = {}
    try { payload = JSON.parse(body.toString()) } catch {}

    if (payload.ref !== 'refs/heads/master') {
      res.writeHead(200).end('ignored — not main')
      return
    }

    res.writeHead(200).end('deploying')
    deploy()
  })
})

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] webhook server listening on port ${PORT}`)
})
