import Link from 'next/link'
import { getSnapshot } from '@/lib/db'

export const dynamic = 'force-dynamic'

const modules = [
  { href: '/',         label: 'Home',     color: '#f5f5f7' },
  { href: '/calendar', label: 'Calendar', color: '#0a84ff' },
  { href: '/music',    label: 'Music',    color: '#bf5af2' },
  { href: '/news',     label: 'News',     color: '#ff9f0a' },
  { href: '/classes',  label: 'Classes',  color: '#30d158' },
  { href: '/finance',  label: 'Finance',  color: '#64d2ff' },
  { href: '/trading',  label: 'Trading',  color: '#ff453a' },
]

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
  const [calData, trading] = await Promise.all([
    getSnapshot('calendar'),
    getSnapshot('trading'),
  ])

  const canvas: any[]   = calData?.canvas ?? []
  const gcal: any[]     = calData?.google ?? []
  const today           = new Date().toLocaleDateString('en-CA')
  const todayEvents     = gcal.filter(e => e.date === today)

  const nextAssignment = canvas
    .filter(e => Math.ceil((parseLocal(e.date).getTime() - Date.now()) / 86400_000) >= 0)
    .sort((a, b) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())[0]

  const spy = trading?.quotes?.['SPY']

  return (
    <div>
      <h1 className="text-3xl font-semibold text-white tracking-tight mb-8">Hi Ethan</h1>

      {/* Summary */}
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

        {todayEvents.length > 0 && (
          <div>
            <p className="text-2xs text-muted font-mono uppercase tracking-widest mb-1">Today</p>
            {todayEvents.slice(0, 3).map((e: any) => (
              <p key={e.id} className="text-sm text-white">
                {e.title}
                {e.time && <span className="text-dim text-xs"> · {e.time}</span>}
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

        {!nextAssignment && todayEvents.length === 0 && !spy && (
          <p className="text-sm text-dim">Agents are warming up — check back soon.</p>
        )}
      </div>

      {/* Modules */}
      <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Modules</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {modules.filter(m => m.href !== '/').map(m => (
          <Link
            key={m.href}
            href={m.href}
            className="group bg-card border border-border rounded-2xl p-5 hover:bg-white/[0.02] transition-all"
            style={{ borderLeftColor: m.color, borderLeftWidth: '2px' }}
          >
            <p className="font-medium group-hover:opacity-80 transition-opacity" style={{ color: m.color }}>{m.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
