'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera } from 'lucide-react'

const modules = [
  { href: '/calendar', label: 'Calendar', color: '#0a84ff', agent: 'calendar' },
  { href: '/finance',  label: 'Finance',  color: '#64d2ff', agent: 'trading'  },
  { href: '/trading',  label: 'Trading',  color: '#ff453a', agent: 'trading'  },
  { href: '/news',     label: 'News',     color: '#ff9f0a', agent: 'finance'  },
  { href: '/classes',  label: 'Classes',  color: '#30d158', agent: 'school'   },
  { href: '/music',    label: 'Music',    color: '#bf5af2', agent: 'music'    },
]

export default function HomeModules({ summaries }: { summaries: Record<string, string | null> }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {modules.map(m => {
        const summary = summaries[m.agent] ?? null
        const isOpen = expanded === m.href

        return (
          <div
            key={m.href}
            className="bg-card border border-border rounded-2xl overflow-hidden"
            style={{ borderLeftColor: m.color, borderLeftWidth: '2px' }}
          >
            <div className="flex items-center justify-between p-5">
              <Link
                href={m.href}
                className="font-medium hover:opacity-70 transition-opacity"
                style={{ color: m.color }}
              >
                {m.label}
              </Link>
              {summary && (
                <button
                  onClick={() => setExpanded(isOpen ? null : m.href)}
                  className="text-muted hover:text-dim transition-colors p-1 -mr-1 flex-shrink-0"
                  title="Agent snapshot"
                >
                  <Camera size={13} strokeWidth={isOpen ? 2 : 1.5} className={isOpen ? 'text-accent' : ''} />
                </button>
              )}
            </div>

            {isOpen && summary && (
              <div className="px-5 pb-4 border-t border-border pt-3">
                <p className="text-xs text-dim leading-relaxed">{summary}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
