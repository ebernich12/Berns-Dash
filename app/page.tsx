import Link from 'next/link'

const modules = [
  { href: '/classes',  label: 'Classes',  desc: 'Courses & grades',           tag: 'UNH'      },
  { href: '/finance',  label: 'Finance',  desc: 'Markets · Macro · Tickers',  tag: 'Finance'  },
  { href: '/calendar', label: 'Calendar', desc: 'Macro events · Earnings',    tag: 'Finance'  },
  { href: '/news',     label: 'News',     desc: 'Headlines · Sentiment',      tag: 'Finance'  },
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
        <div className="grid grid-cols-3 gap-3">
          {modules.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-card border border-border rounded-xl p-5 hover:border-accent/40 hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-white group-hover:text-accent transition-colors">{m.label}</p>
                <span className="text-2xs text-muted font-mono mt-0.5">{m.tag}</span>
              </div>
              <p className="text-xs text-dim mt-1.5">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
