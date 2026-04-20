import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'

export const dynamic = 'force-dynamic'

const COURSES = [
  { code: 'FIN 301',  name: 'Financial Management',         credits: 4 },
  { code: 'ECON 402', name: 'Managerial Economics',         credits: 4 },
  { code: 'FIN 340',  name: 'Investments',                  credits: 4 },
  { code: 'ACCT 301', name: 'Managerial Accounting',        credits: 4 },
  { code: 'QMB 295',  name: 'Quantitative Decision Making', credits: 4 },
  { code: 'FIN 499',  name: 'Atkins Investment Group',      credits: 2, note: 'Club + Class' },
]

const TOTAL_CREDITS = COURSES.reduce((s, c) => s + c.credits, 0)

function dueSoon(iso: string | null) {
  if (!iso) return false
  return new Date(iso).getTime() - Date.now() < 3 * 86400_000
}

function formatDue(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default async function ClassesPage() {
  const data        = await getSnapshot('school')
  const assignments = data?.assignments ?? []

  return (
    <div>
      <PageHeader title="Classes" subtitle="Spring 2026 — UNH Paul College of Business" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Cumulative GPA</p>
          <p className="text-2xl font-bold text-white">3.83</p>
          <p className="text-xs text-green mt-1">Dean's List</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Credits This Semester</p>
          <p className="text-2xl font-bold text-white">{TOTAL_CREDITS}</p>
          <p className="text-xs text-muted mt-1">{COURSES.length} courses</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Study Abroad</p>
          <p className="text-2xl font-bold text-white">Fall 2026</p>
          <p className="text-xs text-muted mt-1">Australia</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Assignments</p>
          <p className="text-2xl font-bold text-white">{assignments.length}</p>
          <p className="text-xs text-muted mt-1">upcoming</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course table */}
        <div className="col-span-2">
          <Card title="Current Courses">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs border-b border-border">
                  <th className="text-left pb-2">Code</th>
                  <th className="text-left pb-2">Course</th>
                  <th className="text-left pb-2">Cr</th>
                </tr>
              </thead>
              <tbody>
                {COURSES.map(c => (
                  <tr key={c.code} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-accent font-mono text-xs">{c.code}</td>
                    <td className="py-2.5">
                      <span className="text-white">{c.name}</span>
                      {c.note && (
                        <span className="ml-2 text-xs bg-yellow/10 text-yellow px-1.5 py-0.5 rounded">{c.note}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-muted text-xs">{c.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Upcoming assignments */}
        <Card title="Upcoming Assignments">
          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.slice(0, 8).map((a: any) => (
                <div key={a.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <a href={a.html_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-white hover:text-accent leading-snug block">{a.name}</a>
                  <p className={`text-xs mt-0.5 ${dueSoon(a.due_at) ? 'text-red' : 'text-muted'}`}>
                    Due {formatDue(a.due_at)}
                  </p>
                  <p className="text-xs text-muted">{a.points_possible} pts · {a.course_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Waiting for SchoolAgent.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
