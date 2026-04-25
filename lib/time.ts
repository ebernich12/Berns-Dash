const ET = 'America/New_York'

export function fmtDateTimeET(iso: string | Date) {
  return new Date(iso).toLocaleString('en-US', { timeZone: ET })
}

export function fmtDateET(iso: string | Date) {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: ET, month: 'short', day: 'numeric', year: 'numeric' })
}

export function todayET(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ET })
}
