'use client'

import { useState, useEffect } from 'react'

function dueSoon(iso: string | null) {
  if (!iso) return false
  return new Date(iso).getTime() - Date.now() < 3 * 86400_000
}

function formatDue(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AssignmentsList({ assignments }: { assignments: any[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem('classes-hidden-assignments')
    if (stored) setHidden(new Set(JSON.parse(stored)))
  }, [])

  function dismiss(id: string) {
    setHidden(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem('classes-hidden-assignments', JSON.stringify([...next]))
      return next
    })
  }

  const visible = assignments.filter(a => !hidden.has(String(a.id)))

  if (visible.length === 0) {
    return <p className="text-xs text-muted">All caught up.</p>
  }

  return (
    <div className="space-y-3">
      {visible.map((a: any) => (
        <div key={a.id} className="border-b border-border pb-2 last:border-0 last:pb-0 flex items-start gap-2">
          <button
            onClick={() => dismiss(String(a.id))}
            className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-border flex items-center justify-center hover:border-accent transition-colors"
          />
          <div className="flex-1 min-w-0">
            <a href={a.html_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-white hover:text-accent leading-snug block">{a.name}</a>
            <p className={`text-xs mt-0.5 ${dueSoon(a.due_at) ? 'text-red' : 'text-muted'}`}>
              Due {formatDue(a.due_at)}
            </p>
            <p className="text-xs text-muted">{a.points_possible} pts · {a.course_name}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
