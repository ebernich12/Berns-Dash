import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import CalendarClient from './CalendarClient'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const calData    = await getSnapshot('calendar')
  const schoolData = await getSnapshot('school')

  const canvas   = schoolData?.calendar ?? []
  const gcal     = calData?.google      ?? []
  const earnings = calData?.earnings    ?? []
  const econ     = calData?.economic    ?? []
  const macro    = calData?.macro       ?? []

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Next 7 days — Canvas · Google · FRED & Earnings" />
      <CalendarClient
        canvas={canvas}
        gcal={gcal}
        econ={econ}
        earnings={earnings}
        macro={macro}
      />
    </div>
  )
}
