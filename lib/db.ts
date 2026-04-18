import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function getSnapshot(agent: string): Promise<any | null> {
  const res = await pool.query(
    'SELECT data FROM agent_snapshots WHERE agent = $1',
    [agent]
  )
  return res.rows[0]?.data ?? null
}

export { pool }
