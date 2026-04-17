import { NextResponse } from 'next/server'
import fs from 'fs'

const DATA_PATH = 'C:\\Users\\ethan\\OneDrive\\Claude Code Projects\\Bertrand\\data\\latest.json'

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))

    const ig = data.instagram?.followers ?? ''
    const igNum = parseInt(ig.replace(/\D/g, '')) || 0

    const tt = data.tiktok?.followers ?? ''
    const ttNum = parseInt(tt.replace(/\D/g, '')) || 0

    return NextResponse.json([
      { platform: 'TikTok',    followers: ttNum,                       color: '#69C9D0' },
      { platform: 'Instagram', followers: igNum,                       color: '#E1306C' },
      { platform: 'YouTube',   followers: data.youtube?.subscribers ?? 0, color: '#FF0000' },
    ])
  } catch {
    return NextResponse.json([], { status: 404 })
  }
}
