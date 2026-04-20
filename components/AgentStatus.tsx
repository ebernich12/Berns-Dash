import { getAgentStatuses } from '@/lib/db'

const AGENTS = [
  { key: 'calendar', label: 'Cally'   },
  { key: 'trading',  label: 'Trader'  },
  { key: 'finance',  label: 'Finance' },
  { key: 'music',    label: 'Music'   },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function statusColor(dateStr: string | undefined) {
  if (!dateStr) return '#3a3a4a'
  const h = (Date.now() - new Date(dateStr).getTime()) / 3_600_000
  if (h < 24) return '#30d158'
  if (h < 48) return '#ffd60a'
  return '#ff453a'
}

export default async function AgentStatus() {
  const rows = await getAgentStatuses()
  const map = Object.fromEntries(rows.map(r => [r.agent, r.updated_at]))

  return (
    <div className="px-4 py-4 border-t border-border">
      <p className="text-2xs text-muted font-mono uppercase tracking-widest mb-2">Agents</p>
      <div className="space-y-1.5">
        {AGENTS.map(({ key, label }) => {
          const ts = map[key]
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor(ts) }} />
                <span className="text-xs text-dim">{label}</span>
              </div>
              <span className="text-2xs text-muted font-mono">{ts ? timeAgo(ts) : 'never'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
