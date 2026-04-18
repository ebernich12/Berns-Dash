import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { agent, data } = body

  if (!agent || !data) {
    return NextResponse.json({ error: 'Missing agent or data' }, { status: 400 })
  }

  await pool.query(
    `INSERT INTO agent_snapshots (agent, data, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (agent) DO UPDATE SET data = $2, updated_at = NOW()`,
    [agent, JSON.stringify(data)]
  )

  return NextResponse.json({ ok: true, agent, updated_at: new Date().toISOString() })
}
