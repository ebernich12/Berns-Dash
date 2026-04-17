import { NextRequest, NextResponse } from 'next/server'
import { getOAuthClient } from '@/lib/google'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 })

  try {
    const auth    = getOAuthClient()
    const { tokens } = await auth.getToken(code)

    return NextResponse.json({
      message: 'Add this to your .env.local and Vercel env vars',
      GOOGLE_REFRESH_TOKEN: tokens.refresh_token ?? '(no refresh token — re-auth with prompt=consent)',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
