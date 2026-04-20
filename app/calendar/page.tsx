import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import CalendarClient from './CalendarClient'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const calData = await getSnapshot('calendar')

  const canvas   = calData?.canvas   ?? []
  const gcal     = calData?.google   ?? []
  const earnings = calData?.earnings ?? []
  const econ     = calData?.economic ?? []

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Next 7 days — Canvas · Google · FRED & Earnings" />
      <CalendarClient
        canvas={canvas}
        gcal={gcal}
        econ={econ}
        earnings={earnings}
      />
    </div>
  )
}
