'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/Card'

function dateDiff(dateStr: string) {
  if (!dateStr) return Infinity
  const today = new Date().toLocaleDateString('en-CA')
  const [ty, tm, td] = today.split('-').map(Number)
  const [dy, dm, dd] = dateStr.slice(0, 10).split('-').map(Number)
  return Math.round((Date.UTC(dy, dm-1, dd) - Date.UTC(ty, tm-1, td)) / 86400_000)
}

function daysUntil(dateStr: string) {
  const diff = dateDiff(dateStr)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

function isWithin14Days(dateStr: string) {
  const diff = dateDiff(dateStr)
  return diff >= 0 && diff <= 14
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      {children}
    </div>
  )
}

export default function CalendarClient({ canvas, gcal, econ, earnings }: {
  canvas: any[]
  gcal: any[]
  econ: any[]
  earnings: any[]
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('cal-hidden-canvas')
    if (stored) setHidden(new Set(JSON.parse(stored)))
  }, [])

  // Refresh server data every 5 minutes so dates/events stay current
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [router])

  function toggle(id: string) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('cal-hidden-canvas', JSON.stringify([...next]))
      return next
    })
  }

  const allCanvas    = canvas.filter(e => e.date && dateDiff(e.date) >= 0)
  const gcal7        = gcal.filter(e => isWithin14Days(e.date))
  const econ7        = econ.filter(e => isWithin14Days(e.date))
  const earnings14   = earnings.filter(e => isWithin14Days(e.date))

  // Show all upcoming canvas, hide checked ones, but always show next 7 unchecked
  const visibleCanvas = allCanvas.filter(e => !hidden.has(`canvas-${e.title}-${e.date}`)).slice(0, 7)

  return (
    <div className="space-y-6">

      {/* Row 1: Canvas + Google Cal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Canvas — Assignments</p>
          <Card>
            {visibleCanvas.length > 0 ? visibleCanvas.map((e: any, i: number) => {
              const id = `canvas-${e.title}-${e.date}`
              return (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <button
                    onClick={() => toggle(id)}
                    className="flex-shrink-0 w-4 h-4 rounded border border-border flex items-center justify-center hover:border-accent transition-colors"
                  >
                    <span className="text-accent text-xs opacity-0 group-hover:opacity-100" />
                  </button>
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <div>
                      <p className="text-sm text-white">{e.title}</p>
                      {e.course && <p className="text-xs text-dim">{e.course}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${e.type === 'assignment' ? 'bg-accent/10 text-accent' : 'bg-border text-muted'}`}>{e.type}</span>
                      <span className="text-xs font-mono text-dim">{daysUntil(e.date)}</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <p className="text-sm text-dim py-2">All caught up.</p>
            )}
          </Card>
        </div>

        <div>
          <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Google Calendar</p>
          <Card>
            {gcal7.length > 0 ? gcal7.map((e: any) => (
              <Row key={e.id}>
                <div>
                  {e.link ? (
                    <a href={e.link} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-white hover:text-accent transition-colors">{e.title}</a>
                  ) : (
                    <p className="text-sm text-white">{e.title}</p>
                  )}
                  {e.time && <p className="text-xs text-dim">{e.time}</p>}
                </div>
                <span className="text-xs font-mono text-dim ml-2 flex-shrink-0">{daysUntil(e.date)}</span>
              </Row>
            )) : (
              <p className="text-sm text-dim py-2">No events in next 7 days.</p>
            )}
          </Card>
        </div>

      </div>

      {/* Row 2: Economic Releases — full width, high importance only */}
      <div>
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Economic Releases</p>
        <div className="rounded-2xl overflow-hidden border border-border">
          <iframe
            src={`https://www.tradingview.com/embed-widget/events/?locale=en#${encodeURIComponent(JSON.stringify({
              colorTheme: 'dark',
              isTransparent: true,
              width: '100%',
              height: 500,
              importanceFilter: '1',
              countryFilter: 'us',
            }))}`}
            width="100%"
            height="500"
            frameBorder="0"
            allowTransparency={true}
          />
        </div>
      </div>

      {/* Row 3: Earnings — full width grid */}
      <div>
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Earnings — Next 2 Weeks</p>
        {earnings14.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earnings14.map((e: any, i: number) => {
              const dateLabel = (() => {
                const [y, m, d] = e.date.slice(0, 10).split('-').map(Number)
                return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              })()
              const hourLabel = e.hour === 'bmo' ? 'Before Open' : e.hour === 'amc' ? 'After Close' : (e.hour?.toUpperCase() ?? '—')
              const hourColor = e.hour === 'bmo' ? 'text-green-400' : e.hour === 'amc' ? 'text-yellow-400' : 'text-muted'
              return (
                <Card key={i}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl text-accent font-bold">{e.symbol}</span>
                        {e.sector && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-border text-muted">{e.sector}</span>
                        )}
                      </div>
                      {e.name && <p className="text-xs text-muted mt-0.5">{e.name}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono text-white">{daysUntil(e.date)}</p>
                      <p className="text-xs text-dim">{dateLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium ${hourColor}`}>{hourLabel}</span>
                    <span className="text-xs text-border">·</span>
                    <span className="text-xs text-muted">EPS est: <span className="text-white font-mono">{e.epsEstimate ?? '—'}</span></span>
                  </div>

                  {e.why_it_matters && (
                    <p className="text-xs text-dim leading-relaxed mb-3 border-l-2 border-accent/30 pl-2">{e.why_it_matters}</p>
                  )}

                  {e.what_to_watch && e.what_to_watch.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted uppercase tracking-widest font-mono mb-1.5">Watch</p>
                      <ul className="space-y-1">
                        {e.what_to_watch.map((item: string, j: number) => (
                          <li key={j} className="text-xs text-dim flex gap-2">
                            <span className="text-accent flex-shrink-0">›</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {e.summary && (
                    <p className="text-xs text-white/60 italic leading-relaxed border-t border-border pt-2">{e.summary}</p>
                  )}
                </Card>
              )
            })}
          </div>
        ) : (
          <Card><p className="text-sm text-dim py-2">No earnings in the next 2 weeks.</p></Card>
        )}
      </div>

    </div>
  )
}
