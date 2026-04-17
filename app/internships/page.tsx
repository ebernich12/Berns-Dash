import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'

const pipeline = [
  { company: 'Walleye Capital',  role: 'Quant Research Intern',      status: 'Warm Intro',  priority: 1, notes: 'Dad works there — ask for intro' },
  { company: 'Evercore',         role: 'Sophomore IB Program',       status: 'To Apply',    priority: 2, notes: 'Covered their 10-K at Atkins — direct story' },
  { company: 'BAM',              role: 'Investment Analyst Intern',  status: 'Warm Intro',  priority: 3, notes: "Dad's former employer" },
  { company: 'Fidelity',         role: 'Equity Research Intern',     status: 'To Apply',    priority: 4, notes: 'Boston, strong sophomore programs' },
  { company: 'State Street',     role: 'Investment Analyst Intern',  status: 'To Apply',    priority: 5, notes: 'Boston, UNH recruiter relationship' },
  { company: 'Wellington Mgmt',  role: 'Investment Analyst Intern',  status: 'To Apply',    priority: 6, notes: 'Boston, asset management fit' },
]

const statusColor = (s: string) => {
  if (s === 'Warm Intro')  return 'bg-green/10 text-green'
  if (s === 'In Progress') return 'bg-yellow/10 text-yellow'
  if (s === 'Applied')     return 'bg-accent/10 text-accent'
  if (s === 'Rejected')    return 'bg-red/10 text-red'
  return 'bg-border text-muted'
}

export default function InternshipsPage() {
  return (
    <div>
      <PageHeader
        title="Internships"
        subtitle="Pipeline tracker — Summer 2026 target"
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Warm Intros</p>
          <p className="text-2xl font-bold text-green">2</p>
          <p className="text-xs text-muted mt-1">Walleye, BAM</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">To Apply</p>
          <p className="text-2xl font-bold text-yellow">4</p>
          <p className="text-xs text-muted mt-1">Cold targets</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Applied</p>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-muted mt-1">—</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">In Progress</p>
          <p className="text-2xl font-bold text-accent">1</p>
          <p className="text-xs text-muted mt-1">From tracker</p>
        </Card>
      </div>

      <Card title="Pipeline">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-border">
              <th className="text-left pb-2">#</th>
              <th className="text-left pb-2">Company</th>
              <th className="text-left pb-2">Role</th>
              <th className="text-left pb-2">Status</th>
              <th className="text-left pb-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((p) => (
              <tr key={p.company} className="border-b border-border last:border-0">
                <td className="py-2.5 text-muted text-xs">{p.priority}</td>
                <td className="py-2.5 text-white font-semibold">{p.company}</td>
                <td className="py-2.5 text-muted text-xs">{p.role}</td>
                <td className="py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-2.5 text-muted text-xs">{p.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
