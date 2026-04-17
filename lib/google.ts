import { google } from 'googleapis'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ?? 'http://localhost:3000/api/auth/google/callback'

export function getOAuthClient() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
  if (REFRESH_TOKEN) auth.setCredentials({ refresh_token: REFRESH_TOKEN })
  return auth
}

export function getAuthUrl() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  })
}

export interface CalendarEvent {
  id:       string
  title:    string
  date:     string
  time:     string | null
  allDay:   boolean
  calendar: string
  link:     string | null
}

export async function fetchGoogleCalendar(): Promise<CalendarEvent[]> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) return []

  try {
    const auth     = getOAuthClient()
    const calendar = google.calendar({ version: 'v3', auth })

    const now   = new Date().toISOString()
    const in30  = new Date(Date.now() + 30 * 86400_000).toISOString()

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin:    now,
      timeMax:    in30,
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return (res.data.items ?? []).map(e => {
      const start  = e.start?.dateTime ?? e.start?.date ?? ''
      const allDay = !e.start?.dateTime
      const date   = start.slice(0, 10)
      const time   = allDay ? null : new Date(start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      return {
        id:       e.id ?? '',
        title:    e.summary ?? '(No title)',
        date,
        time,
        allDay,
        calendar: 'Personal',
        link:     e.htmlLink ?? null,
      }
    })
  } catch {
    return []
  }
}
