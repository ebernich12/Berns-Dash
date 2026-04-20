import { getSnapshot } from '@/lib/db'
import HomeModules from '@/components/HomeModules'

export const dynamic = 'force-dynamic'

function parseLocal(d: string) {
  return d.includes('T') ? new Date(d) : new Date(`${d}T12:00:00`)
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((parseLocal(dateStr).getTime() - Date.now()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

export default async function Home() {
  const [calData, trading, finance, school, music] = await Promise.all([
    getSnapshot('calendar'),
    getSnapshot('trading'),
    getSnapshot('finance'),
    getSnapshot('school'),
    getSnapshot('music'),
  ])

  const canvas: any[] = calData?.canvas ?? []
  const gcal: any[]   = calData?.google ?? []

  const nextAssignment = canvas
    .filter(e => parseLocal(e.date).getTime() >= Date.now() - 3600_000)
    .sort((a, b) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())[0]

  const upcomingEvents = gcal
    .filter(e => parseLocal(e.date).getTime() >= Date.now() - 3600_000)
    .sort((a, b) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())
    .slice(0, 3)

  const spy = trading?.quotes?.['SPY']

  const summaries: Record<string, string | null> = {
    calendar: calData?.summary ?? null,
    trading:  trading?.summary  ?? null,
    finance:  finance?.summary  ?? null,
    school:   school?.summary   ?? null,
    music:    music?.summary    ?? null,
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white tracking-tight mb-8">Hi Ethan</h1>

      {/* Summary card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-8 space-y-4">
        {nextAssignment && (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xs text-muted font-mono uppercase tracking-widest mb-1">Next Due</p>
              <p className="text-sm text-white">{nextAssignment.title}</p>
              {nextAssignment.course && <p className="text-xs text-dim">{nextAssignment.course}</p>}
            </div>
            <span className="text-xs font-mono text-accent flex-shrink-0 ml-4">{daysUntil(nextAssignment.date)}</span>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div>
            <p className="text-2xs text-muted font-mono uppercase tracking-widest mb-1">Upcoming</p>
            {upcomingEvents.map((e: any) => (
              <p key={e.id} className="text-sm text-white">
                {e.title}
                <span className="text-dim text-xs"> · {daysUntil(e.date)}{e.time ? ` · ${e.time}` : ''}</span>
              </p>
            ))}
          </div>
        )}

        {spy && (
          <div className="flex items-center gap-3">
            <p className="text-2xs text-muted font-mono uppercase tracking-widest">SPY</p>
            <p className="text-sm text-white">${spy.c?.toFixed(2)}</p>
            {spy.dp != null && (
              <p className={`text-xs font-mono ${spy.dp >= 0 ? 'text-green' : 'text-red'}`}>
                {spy.dp >= 0 ? '+' : ''}{spy.dp.toFixed(2)}%
              </p>
            )}
          </div>
        )}

        {!nextAssignment && upcomingEvents.length === 0 && !spy && (
          <p className="text-sm text-dim">Agents are warming up — check back soon.</p>
        )}
      </div>

      {/* Modules */}
      <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Modules</p>
      <HomeModules summaries={summaries} />
    </div>
  )
}
