'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard, BookOpen,
  LineChart, Calendar, Newspaper,
  TrendingUp, Music,
} from 'lucide-react'

const nav = [
  {
    group: 'Personal',
    items: [
      { href: '/',        label: 'Home',    icon: LayoutDashboard },
      { href: '/classes', label: 'Classes', icon: BookOpen        },
      { href: '/music',   label: 'Music',   icon: Music           },
    ],
  },
  {
    group: 'Finance',
    items: [
      { href: '/finance',  label: 'Finance',  icon: LineChart  },
      { href: '/trading',  label: 'Trading',  icon: TrendingUp },
      { href: '/calendar', label: 'Calendar', icon: Calendar   },
      { href: '/news',     label: 'News',     icon: Newspaper  },
    ],
  },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-48 bg-panel border-r border-border flex flex-col z-10">
      <div className="px-5 pt-6 pb-5">
        <p className="text-base font-semibold text-white tracking-tight">Ethan Bernich</p>
        <p className="text-xs text-muted mt-0.5">Finance + Economics · UNH '28</p>
      </div>

      <nav className="flex-1 px-2 overflow-y-auto">
        {nav.map(({ group, items }) => (
          <div key={group} className="mb-5">
            <p className="text-2xs text-muted uppercase tracking-widest px-3 mb-1.5 font-mono">{group}</p>
            {items.map(({ href, label, icon: Icon }) => {
              const active = path === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all',
                    active
                      ? 'text-white bg-white/5'
                      : 'text-dim hover:text-text hover:bg-white/[0.03]'
                  )}
                >
                  <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
          <p className="text-xs text-muted">All systems live</p>
        </div>
      </div>
    </aside>
  )
}
