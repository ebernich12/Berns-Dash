'use client'

import { useState, useEffect } from 'react'

export default function Clock() {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }))
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!time) return null

  return (
    <div className="px-5 py-4 border-t border-border">
      <p className="text-xs font-mono text-white tabular-nums">{time}</p>
      <p className="text-2xs text-muted mt-0.5">{date}</p>
    </div>
  )
}
