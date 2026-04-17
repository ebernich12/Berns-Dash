import { NextResponse } from 'next/server'
import fs from 'fs'

async function loadBertrand() {
  const remoteUrl = process.env.BERTRAND_DATA_URL
  if (remoteUrl) {
    try {
      const res = await fetch(remoteUrl, { next: { revalidate: 3600 } })
      if (res.ok) return res.json()
    } catch {}
  }
  try {
    return JSON.parse(fs.readFileSync(
      'C:\\Users\\ethan\\OneDrive\\Claude Code Projects\\Bertrand\\data\\latest.json',
      'utf-8'
    ))
  } catch {}
  return null
}

export async function GET() {
  const data = await loadBertrand()
  if (!data) return NextResponse.json([], { status: 404 })

  const ig = data.instagram?.followers ?? ''
  const igNum = parseInt(ig.replace(/\D/g, '')) || 0

  const tt = data.tiktok?.followers ?? ''
  const ttNum = parseInt(tt.replace(/\D/g, '')) || 0

  return NextResponse.json([
    { platform: 'TikTok',    followers: ttNum,                        color: '#69C9D0' },
    { platform: 'Instagram', followers: igNum,                        color: '#E1306C' },
    { platform: 'YouTube',   followers: data.youtube?.subscribers ?? 0, color: '#FF0000' },
  ])
}
