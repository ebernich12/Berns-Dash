// Canvas LMS API client — UNH
// ICS feed URL (no auth needed)
const CANVAS_ICS = 'https://mycourses.unh.edu/feeds/calendars/user_5JQHKGGPGWFUCP2S4VlIY1mWlnIx4yBjevKriSmP.ics'

export interface CanvasEvent {
  title:  string
  date:   string
  course: string
  type:   'assignment' | 'event'
}

function parseICS(raw: string): CanvasEvent[] {
  const events: CanvasEvent[] = []
  const now   = new Date()
  const in30  = new Date(Date.now() + 30 * 86400_000)
  const blocks = raw.split('BEGIN:VEVENT')

  for (const block of blocks.slice(1)) {
    const get = (key: string) =>
      block.match(new RegExp(`${key}[^:]*:([^\r\n]+)`))?.[1]?.trim() ?? ''

    const summary  = get('SUMMARY')
    const dtstart  = get('DTSTART')
    const categories = get('CATEGORIES').toLowerCase()
    if (!summary || !dtstart) continue

    const dateStr = dtstart.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
    const date    = new Date(dateStr)
    if (date < now || date > in30) continue

    const course = summary.match(/\[(.+?)\]/)?.[1] ?? ''
    const title  = summary.replace(/\s*\[.+?\]\s*/, '').trim()

    events.push({ title, date: dateStr, course, type: categories.includes('assignment') ? 'assignment' : 'event' })
  }
  return events.sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchCanvasCalendar(): Promise<CanvasEvent[]> {
  try {
    const res = await fetch(CANVAS_ICS, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    return parseICS(await res.text())
  } catch { return [] }
}


// Docs: https://canvas.instructure.com/doc/api/
//
// HOW TO GET YOUR TOKEN:
//   1. Go to https://unh.instructure.com (or your Canvas URL)
//   2. Click your profile picture → Settings
//   3. Scroll to "Approved Integrations" → "+ New Access Token"
//   4. Give it a name (e.g. "Dashboard"), no expiry needed
//   5. Copy the token and add to .env.local as CANVAS_TOKEN
//   6. Also set CANVAS_BASE_URL=https://unh.instructure.com
//
// Note: Token gives read-only access to your own courses, assignments, grades.

const BASE  = process.env.CANVAS_BASE_URL ?? ''
const TOKEN = process.env.CANVAS_TOKEN    ?? ''

function headers() {
  return { Authorization: `Bearer ${TOKEN}` }
}

export interface CanvasCourse {
  id:           number
  name:         string
  course_code:  string
  enrollment_term_id: number
  workflow_state: string
  start_at:     string | null
  end_at:       string | null
}

export interface CanvasAssignment {
  id:             number
  name:           string
  due_at:         string | null
  points_possible: number
  submission_types: string[]
  course_id:      number
  html_url:       string
}

export interface CanvasGrade {
  course_id:              number
  course_name:            string
  current_score:          number | null
  final_score:            number | null
  current_grade:          string | null
  final_grade:            string | null
}

/** Fetch active courses for the current user */
export async function fetchCourses(): Promise<CanvasCourse[]> {
  if (!BASE || !TOKEN) return []
  const res = await fetch(
    `${BASE}/api/v1/courses?enrollment_state=active&per_page=20`,
    { headers: headers(), next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  return res.json()
}

/** Fetch upcoming assignments across all courses */
export async function fetchUpcomingAssignments(): Promise<CanvasAssignment[]> {
  if (!BASE || !TOKEN) return []
  const res = await fetch(
    `${BASE}/api/v1/users/self/upcoming_events?per_page=20`,
    { headers: headers(), next: { revalidate: 1800 } }
  )
  if (!res.ok) return []
  const events = await res.json()
  return events.filter((e: any) => e.type === 'Assignment').map((e: any) => e.assignment)
}

/** Fetch assignments for a specific course */
export async function fetchCourseAssignments(courseId: number): Promise<CanvasAssignment[]> {
  if (!BASE || !TOKEN) return []
  const res = await fetch(
    `${BASE}/api/v1/courses/${courseId}/assignments?order_by=due_at&per_page=20`,
    { headers: headers(), next: { revalidate: 1800 } }
  )
  if (!res.ok) return []
  return res.json()
}

/** Fetch current grades for all active enrollments */
export async function fetchGrades(): Promise<CanvasGrade[]> {
  if (!BASE || !TOKEN) return []
  const res = await fetch(
    `${BASE}/api/v1/users/self/enrollments?type[]=StudentEnrollment&state[]=active&per_page=20`,
    { headers: headers(), next: { revalidate: 3600 } }
  )
  if (!res.ok) return []
  const enrollments = await res.json()
  return enrollments.map((e: any) => ({
    course_id:     e.course_id,
    course_name:   e.course?.name ?? '',
    current_score: e.grades?.current_score ?? null,
    final_score:   e.grades?.final_score   ?? null,
    current_grade: e.grades?.current_grade ?? null,
    final_grade:   e.grades?.final_grade   ?? null,
  }))
}

/** Fetch announcements/recent activity */
export async function fetchAnnouncements(courseIds: number[]): Promise<any[]> {
  if (!BASE || !TOKEN || !courseIds.length) return []
  const contextCodes = courseIds.map(id => `course_${id}`).join('&context_codes[]=')
  const res = await fetch(
    `${BASE}/api/v1/announcements?context_codes[]=${contextCodes}&per_page=10`,
    { headers: headers(), next: { revalidate: 1800 } }
  )
  if (!res.ok) return []
  return res.json()
}
