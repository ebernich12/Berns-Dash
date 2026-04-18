import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'

export const dynamic = 'force-dynamic'

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

export default async function CalendarPage() {
  const calData  = await getSnapshot('calendar')
  const schoolData = await getSnapshot('school')

  const canvas   = schoolData?.calendar  ?? []
  const gcal     = calData?.google       ?? []
  const earnings = calData?.earnings     ?? []
  const econ     = calData?.economic     ?? []
  const macro    = calData?.macro        ?? []

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Canvas · Google · FRED & Earnings" />

      {/* Canvas */}
      <div className="mb-8">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Canvas — UNH (next 30 days)</p>
        <Card>
          {canvas.length > 0 ? (
            <div className="divide-y divide-border">
              {canvas.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted w-20 flex-shrink-0">{e.date}</span>
                    <div>
                      <p className="text-sm text-white">{e.title}</p>
                      {e.course && <p className="text-xs text-dim">{e.course}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded ${e.type === 'assignment' ? 'bg-accent/10 text-accent' : 'bg-border text-muted'}`}>
                      {e.type}
                    </span>
                    <span className="text-xs font-mono text-dim w-16 text-right">{daysUntil(e.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">Waiting for SchoolAgent.</p>
          )}
        </Card>
      </div>

      {/* Google Calendar */}
      <div className="mb-8">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Google Calendar (next 30 days)</p>
        <Card>
          {gcal.length > 0 ? (
            <div className="divide-y divide-border">
              {gcal.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted w-20 flex-shrink-0">{e.date}</span>
                    <div>
                      {e.link ? (
                        <a href={e.link} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-white hover:text-accent transition-colors">{e.title}</a>
                      ) : (
                        <p className="text-sm text-white">{e.title}</p>
                      )}
                      {e.time && <p className="text-xs text-dim">{e.time}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded bg-border text-muted">{e.allDay ? 'All day' : 'Event'}</span>
                    <span className="text-xs font-mono text-dim w-16 text-right">{daysUntil(e.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">Waiting for CalendarAgent.</p>
          )}
        </Card>
      </div>

      {/* Macro */}
      <div className="mb-4">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">FRED — Macro</p>
        <div className="grid grid-cols-4 gap-3">
          {macro.length > 0 ? macro.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted mb-2">{m.label}</p>
              <p className="text-xl font-semibold text-white">{m.value.toFixed(2)}</p>
              <p className={`text-xs mt-1 font-mono ${m.change >= 0 ? 'text-green' : 'text-red'}`}>
                {m.change >= 0 ? '+' : ''}{m.change.toFixed(2)}
              </p>
            </div>
          )) : (
            <div className="col-span-4 text-sm text-dim">Waiting for CalendarAgent.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="High-Impact US Events">
          {econ.length > 0 ? (
            <div className="divide-y divide-border">
              {econ.map((e: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm text-white">{e.event}</p>
                    <p className="text-xs text-dim">{e.time?.slice(0, 10)}</p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <p>Est: {e.estimate ?? '—'}</p>
                    <p>Prev: {e.prev ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">No high-impact US events.</p>
          )}
        </Card>

        <Card title="Earnings — Next 30 Days">
          {earnings.length > 0 ? (
            <div className="divide-y divide-border">
              {earnings.map((e: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <div>
                    <p className="text-sm font-mono text-accent">{e.symbol}</p>
                    <p className="text-xs text-dim">{e.date} · {e.hour?.toUpperCase()}</p>
                  </div>
                  <p className="text-xs text-muted">EPS est: {e.epsEstimate ?? '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-dim">No earnings data.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
