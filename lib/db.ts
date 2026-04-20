import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function getSnapshot(agent: string): Promise<any | null> {
  const res = await pool.query(
    'SELECT data FROM agent_snapshots WHERE agent = $1',
    [agent]
  )
  return res.rows[0]?.data ?? null
}

export async function getAgentStatuses(): Promise<{ agent: string; updated_at: string }[]> {
  const res = await pool.query(
    'SELECT agent, updated_at FROM agent_snapshots ORDER BY agent'
  )
  return res.rows
}

export { pool }
