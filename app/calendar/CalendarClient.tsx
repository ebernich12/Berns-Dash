'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `${diff}d`
}

function isWithin7Days(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400_000)
  return diff >= 0 && diff <= 7
}

function CheckableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setChecked(localStorage.getItem(`cal-check-${id}`) === '1')
  }, [id])

  function toggle() {
    const next = !checked
    setChecked(next)
    localStorage.setItem(`cal-check-${id}`, next ? '1' : '0')
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${checked ? 'opacity-40' : ''}`}>
      <button onClick={toggle} className="flex-shrink-0 w-4 h-4 rounded border border-border flex items-center justify-center hover:border-accent transition-colors">
        {checked && <span className="text-accent text-xs">✓</span>}
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default function CalendarClient({ canvas, gcal, econ, earnings, macro }: {
  canvas: any[]
  gcal: any[]
  econ: any[]
  earnings: any[]
  macro: any[]
}) {
  const canvas7 = canvas.filter(e => isWithin7Days(e.date))
  const gcal7 = gcal.filter(e => isWithin7Days(e.date))
  const econ7 = econ.filter(e => isWithin7Days(e.time?.slice(0, 10) ?? e.date))

  return (
    <div className="grid grid-cols-3 gap-6">

      {/* Canvas */}
      <div>
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Canvas — Assignments</p>
        <Card>
          {canvas7.length > 0 ? canvas7.map((e: any, i: number) => (
            <CheckableRow key={i} id={`canvas-${e.title}-${e.date}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{e.title}</p>
                  {e.course && <p className="text-xs text-dim">{e.course}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${e.type === 'assignment' ? 'bg-accent/10 text-accent' : 'bg-border text-muted'}`}>{e.type}</span>
                  <span className="text-xs font-mono text-dim">{daysUntil(e.date)}</span>
                </div>
              </div>
            </CheckableRow>
          )) : (
            <p className="text-sm text-dim py-2">No assignments due in 7 days.</p>
          )}
        </Card>
      </div>

      {/* Google Calendar */}
      <div>
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Google Calendar</p>
        <Card>
          {gcal7.length > 0 ? gcal7.map((e: any) => (
            <CheckableRow key={e.id} id={`gcal-${e.id}`}>
              <div className="flex items-center justify-between">
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
              </div>
            </CheckableRow>
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
            <CheckableRow key={i} id={`econ-${e.event}-${e.time}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{e.event}</p>
                  <p className="text-xs text-dim">{e.time?.slice(0, 10)}</p>
                </div>
                <div className="text-right text-xs text-muted ml-2 flex-shrink-0">
                  <p>Est: {e.estimate ?? '—'}</p>
                  <p>Prev: {e.prev ?? '—'}</p>
                </div>
              </div>
            </CheckableRow>
          )) : (
            <p className="text-sm text-dim py-2">No macro events this week.</p>
          )}
          {earnings.filter(e => isWithin7Days(e.date)).map((e: any, i: number) => (
            <CheckableRow key={`earn-${i}`} id={`earn-${e.symbol}-${e.date}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-mono text-accent">{e.symbol}</p>
                <div className="text-right text-xs text-muted ml-2 flex-shrink-0">
                  <p>{e.date} · {e.hour?.toUpperCase()}</p>
                  <p>EPS: {e.epsEstimate ?? '—'}</p>
                </div>
              </div>
            </CheckableRow>
          ))}
        </Card>
      </div>

    </div>
  )
}
