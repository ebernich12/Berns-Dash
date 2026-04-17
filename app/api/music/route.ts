import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(
  'C:\\Users\\ethan\\OneDrive\\Claude Code Projects\\Bertrand\\data\\latest.json'
)

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'No data yet — run Bertrand first' }, { status: 404 })
  }
}
