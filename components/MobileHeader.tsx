'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard, BookOpen, LineChart,
  Calendar, Newspaper, TrendingUp, Music, X, Menu,
} from 'lucide-react'

const nav = [
  { href: '/',         label: 'Home',     icon: LayoutDashboard, color: '#f5f5f7' },
  { href: '/calendar', label: 'Calendar', icon: Calendar,        color: '#0a84ff' },
  { href: '/finance',  label: 'Finance',  icon: LineChart,       color: '#64d2ff' },
  { href: '/trading',  label: 'Trading',  icon: TrendingUp,      color: '#ff453a' },
  { href: '/news',     label: 'News',     icon: Newspaper,       color: '#ff9f0a' },
  { href: '/classes',  label: 'Classes',  icon: BookOpen,        color: '#30d158' },
  { href: '/music',    label: 'Music',    icon: Music,           color: '#bf5af2' },
]

export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const current = nav.find(n => n.href === path)

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 bg-panel border-b border-border flex items-center justify-between px-4 h-12">
        <div>
          <p className="text-sm font-semibold text-white leading-none">Ethan Bernich</p>
          {current && <p className="text-xs text-muted mt-0.5">{current.label}</p>}
        </div>
        <button onClick={() => setOpen(true)} className="text-dim hover:text-white transition-colors p-1">
          <Menu size={20} />
        </button>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <nav className="relative w-56 bg-panel border-r border-border flex flex-col h-full">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div>
                <p className="text-sm font-semibold text-white">Ethan Bernich</p>
                <p className="text-xs text-muted mt-0.5">Finance + Economics · UNH '28</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-dim hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 px-2 overflow-y-auto">
              {nav.map(({ href, label, icon: Icon, color }) => {
                const active = path === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all mb-0.5',
                      active ? 'text-white bg-white/5' : 'text-dim hover:text-text hover:bg-white/[0.03]'
                    )}
                  >
                    <Icon size={14} strokeWidth={active ? 2 : 1.5} style={{ color }} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
