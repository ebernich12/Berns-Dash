import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import CalendarClient from './CalendarClient'

export const dynamic = 'force-dynamic'

function parseLocal(d: string) {
  return d.includes('T') ? new Date(d) : new Date(`${d}T12:00:00`)
}

function daysUntil(d: string) {
  const diff = Math.ceil((parseLocal(d).getTime() - Date.now()) / 86400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `in ${diff}d`
}

export default async function CalendarPage() {
  const calData = await getSnapshot('calendar')

  const canvas:   any[] = calData?.canvas   ?? []
  const gcal:     any[] = calData?.google   ?? []
  const earnings: any[] = calData?.earnings ?? []
  const econ:     any[] = calData?.economic ?? []

  const today = new Date().toLocaleDateString('en-CA')

  const canvas7 = canvas.filter(e =>
    Math.ceil((parseLocal(e.date).getTime() - Date.now()) / 86400_000) >= 0 &&
    Math.ceil((parseLocal(e.date).getTime() - Date.now()) / 86400_000) <= 7
  )

  const nextAssignment = canvas
    .filter(e => Math.ceil((parseLocal(e.date).getTime() - Date.now()) / 86400_000) >= 0)
    .sort((a, b) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())[0]

  const todayEvents = gcal.filter(e => e.date === today)

  const nextEarnings = earnings
    .filter(e => Math.ceil((parseLocal(e.date).getTime() - Date.now()) / 86400_000) >= 0)
    .sort((a, b) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())[0]

  const summaryParts: string[] = []
  if (canvas7.length > 0) summaryParts.push(`${canvas7.length} assignment${canvas7.length > 1 ? 's' : ''} due this week`)
  if (nextAssignment) summaryParts.push(`next up: ${nextAssignment.title} ${daysUntil(nextAssignment.date)}`)
  if (todayEvents.length > 0) summaryParts.push(`today: ${todayEvents.map((e: any) => e.title).join(', ')}`)
  if (nextEarnings) summaryParts.push(`earnings: ${nextEarnings.symbol} ${daysUntil(nextEarnings.date)}`)

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Next 7 days — Canvas · Google · FRED & Earnings" />

      {summaryParts.length > 0 && (
        <div className="mb-6 bg-card border border-border rounded-2xl px-5 py-4">
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2">This Week</p>
          <p className="text-sm text-white leading-relaxed">{summaryParts.join(' · ')}</p>
        </div>
      )}

      <CalendarClient
        canvas={canvas}
        gcal={gcal}
        econ={econ}
        earnings={earnings}
      />
    </div>
  )
}
