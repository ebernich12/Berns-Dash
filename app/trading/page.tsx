import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function TradingPage() {
  const data = await getSnapshot('trading')

  return (
    <div>
      <PageHeader title="Trading" subtitle="Bot · Positions · Signals" />
      {!data && (
        <p className="text-sm text-dim">Waiting for TradingAgent to post data.</p>
      )}
    </div>
  )
}
