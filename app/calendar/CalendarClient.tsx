'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'

function parseLocalDate(dateStr: string) {
  // "2026-04-20" without a time component parses as UTC midnight, shifting the date in ET.
  return dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T12:00:00`)
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((parseLocalDate(dateStr).getTime() - Date.now()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

function isWithin7Days(dateStr: string) {
  const diff = Math.ceil((parseLocalDate(dateStr).getTime() - Date.now()) / 86400_000)
  return diff >= 0 && diff <= 7
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

  useEffect(() => {
    const stored = localStorage.getItem('cal-hidden-canvas')
    if (stored) setHidden(new Set(JSON.parse(stored)))
  }, [])

  function toggle(id: string) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('cal-hidden-canvas', JSON.stringify([...next]))
      return next
    })
  }

  const allCanvas   = canvas.filter(e => Math.ceil((parseLocalDate(e.date).getTime() - Date.now()) / 86400_000) >= 0)
  const gcal7       = gcal.filter(e => isWithin7Days(e.date))
  const econ7       = econ.filter(e => isWithin7Days(e.date ?? e.time?.slice(0, 10)))
  const earnings7   = earnings.filter(e => isWithin7Days(e.date))

  // Show all upcoming canvas, hide checked ones, but always show next 7 unchecked
  const visibleCanvas = allCanvas.filter(e => !hidden.has(`canvas-${e.title}-${e.date}`)).slice(0, 7)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* Canvas — check off to dismiss, next loads in */}
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

      {/* Google Calendar */}
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

      {/* FRED + Earnings */}
      <div>
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">FRED & Earnings</p>
        <Card>
          {econ7.length > 0 ? econ7.map((e: any, i: number) => (
            <Row key={i}>
              <div>
                <p className="text-sm text-white">{e.release_name ?? e.event}</p>
                <p className="text-xs text-dim">{e.type ?? (e.date ?? e.time?.slice(0, 10))}</p>
              </div>
              <span className="text-xs font-mono text-dim ml-2 flex-shrink-0">{daysUntil(e.date ?? e.time?.slice(0, 10))}</span>
            </Row>
          )) : (
            <p className="text-sm text-dim py-2">No macro events this week.</p>
          )}
          {earnings7.map((e: any, i: number) => (
            <Row key={`earn-${i}`}>
              <p className="text-sm font-mono text-accent">{e.symbol}</p>
              <div className="text-right text-xs text-muted ml-2 flex-shrink-0">
                <p>{e.date} · {e.hour?.toUpperCase()}</p>
                <p>EPS: {e.epsEstimate ?? '—'}</p>
              </div>
            </Row>
          ))}
        </Card>
      </div>

    </div>
  )
}
