import Card from '@/components/Card'
import PageHeader from '@/components/PageHeader'
import { fetchGrades, fetchUpcomingAssignments } from '@/lib/canvas'

const courses = [
  { code: 'FIN 301',  name: 'Financial Management',        credits: 4, status: 'Active' },
  { code: 'ECON 402', name: 'Managerial Economics',        credits: 4, status: 'Active' },
  { code: 'FIN 340',  name: 'Investments',                 credits: 4, status: 'Active' },
  { code: 'ACCT 301', name: 'Managerial Accounting',       credits: 4, status: 'Active' },
  { code: 'QMB 295',  name: 'Quantitative Decision Making',credits: 4, status: 'Active' },
  { code: 'FIN 499',  name: 'Atkins Investment Group',     credits: 2, status: 'Active', note: 'Club + Class' },
]

const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0)

function gradeColor(grade: string | null) {
  if (!grade) return 'text-muted'
  const g = grade.toUpperCase()
  if (g.startsWith('A')) return 'text-green'
  if (g.startsWith('B')) return 'text-accent'
  if (g.startsWith('C')) return 'text-yellow'
  return 'text-red'
}

function dueSoon(iso: string | null) {
  if (!iso) return false
  return new Date(iso).getTime() - Date.now() < 3 * 86400_000
}

function formatDue(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const hasCanvas = !!(process.env.CANVAS_BASE_URL && process.env.CANVAS_TOKEN)

export default async function ClassesPage() {
  const [grades, assignments] = await Promise.allSettled([
    fetchGrades(),
    fetchUpcomingAssignments(),
  ])

  const canvasGrades      = grades.status      === 'fulfilled' ? grades.value      : []
  const canvasAssignments = assignments.status === 'fulfilled' ? assignments.value : []

  // Merge Canvas grades into course list
  const enriched = courses.map(c => {
    const cg = canvasGrades.find(g =>
      g.course_name?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
    )
    return {
      ...c,
      grade:         cg?.current_grade ?? '—',
      currentScore:  cg?.current_score ?? null,
    }
  })

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle="Spring 2026 — UNH Paul College of Business"
      />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Cumulative GPA</p>
          <p className="text-2xl font-bold text-white">3.83</p>
          <p className="text-xs text-green mt-1">Dean's List</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Credits This Semester</p>
          <p className="text-2xl font-bold text-white">{totalCredits}</p>
          <p className="text-xs text-muted mt-1">{courses.length} courses</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Study Abroad</p>
          <p className="text-2xl font-bold text-white">Fall 2026</p>
          <p className="text-xs text-muted mt-1">Australia</p>
        </Card>
        <Card>
          <p className="text-xs text-muted uppercase tracking-widest mb-1">Canvas</p>
          <p className="text-2xl font-bold text-white">{hasCanvas ? '●' : '○'}</p>
          <p className={`text-xs mt-1 ${hasCanvas ? 'text-green' : 'text-muted'}`}>
            {hasCanvas ? 'Connected' : 'Add token to .env.local'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Course table */}
        <div className="col-span-2">
          <Card title="Current Courses">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs border-b border-border">
                  <th className="text-left pb-2">Code</th>
                  <th className="text-left pb-2">Course</th>
                  <th className="text-left pb-2">Cr</th>
                  <th className="text-left pb-2">Grade</th>
                  <th className="text-left pb-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((c) => (
                  <tr key={c.code} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-accent font-mono text-xs">{c.code}</td>
                    <td className="py-2.5">
                      <span className="text-white">{c.name}</span>
                      {c.note && (
                        <span className="ml-2 text-xs bg-yellow/10 text-yellow px-1.5 py-0.5 rounded">
                          {c.note}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-muted text-xs">{c.credits}</td>
                    <td className={`py-2.5 font-bold text-xs ${gradeColor(c.grade)}`}>{c.grade}</td>
                    <td className="py-2.5 text-muted text-xs">
                      {c.currentScore !== null ? `${c.currentScore.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!hasCanvas && (
              <p className="text-xs text-muted mt-3 pt-3 border-t border-border">
                Connect Canvas to populate live grades — see instructions below.
              </p>
            )}
          </Card>
        </div>

        {/* Upcoming assignments */}
        <div className="col-span-1">
          <Card title="Upcoming Assignments">
            {canvasAssignments.length > 0 ? (
              <div className="space-y-3">
                {canvasAssignments.slice(0, 8).map((a: any) => (
                  <div key={a.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                    <a
                      href={a.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white hover:text-accent leading-snug block"
                    >
                      {a.name}
                    </a>
                    <p className={`text-xs mt-0.5 ${dueSoon(a.due_at) ? 'text-red' : 'text-muted'}`}>
                      Due {formatDue(a.due_at)}
                    </p>
                    <p className="text-xs text-muted">{a.points_possible} pts</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  {hasCanvas ? 'No upcoming assignments.' : 'Connect Canvas to see assignments.'}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Canvas connection instructions */}
      {!hasCanvas && (
        <Card title="How to Connect Canvas" className="mt-6">
          <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
            <li>Go to <span className="text-accent">unh.instructure.com</span> and log in</li>
            <li>Click your profile picture → <span className="text-white">Settings</span></li>
            <li>Scroll to <span className="text-white">"Approved Integrations"</span> → <span className="text-white">+ New Access Token</span></li>
            <li>Name it "Dashboard", leave expiry blank, click <span className="text-white">Generate Token</span></li>
            <li>Copy the token (you won't see it again)</li>
            <li>Open <span className="text-white font-mono">.env.local</span> and add:</li>
          </ol>
          <pre className="mt-3 bg-surface rounded p-3 text-xs text-green font-mono">
{`CANVAS_BASE_URL=https://unh.instructure.com
CANVAS_TOKEN=your_token_here`}
          </pre>
          <p className="text-xs text-muted mt-3">Restart the dev server. Live grades + upcoming assignments will populate automatically.</p>
        </Card>
      )}
    </div>
  )
}
