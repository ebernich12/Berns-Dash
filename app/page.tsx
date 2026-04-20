import Link from 'next/link'

const modules = [
  { href: '/',         label: 'Home',     color: '#f5f5f7' },
  { href: '/calendar', label: 'Calendar', color: '#0a84ff' },
  { href: '/music',    label: 'Music',    color: '#bf5af2' },
  { href: '/news',     label: 'News',     color: '#ff9f0a' },
  { href: '/classes',  label: 'Classes',  color: '#30d158' },
  { href: '/finance',  label: 'Finance',  color: '#64d2ff' },
  { href: '/trading',  label: 'Trading',  color: '#ff453a' },
]

export default function Home() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return (
    <div>
      <div className="mb-10">
        <p className="text-dim text-sm mb-1">{greeting}</p>
        <h1 className="text-3xl font-semibold text-white tracking-tight">Ethan Bernich</h1>
        <p className="text-dim text-sm mt-1">Finance + Economics · UNH '28 · Atkins FIG · Lost River Fleet</p>
      </div>

      <div className="mb-10">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-3">Modules</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {modules.filter(m => m.href !== '/').map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-card border border-border rounded-2xl p-5 hover:bg-white/[0.02] transition-all overflow-hidden relative"
              style={{ borderLeftColor: m.color, borderLeftWidth: '2px' }}
            >
              <p className="font-medium text-white group-hover:opacity-80 transition-opacity" style={{ color: m.color }}>{m.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
