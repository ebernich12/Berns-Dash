import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function MusicPage() {
  const data = await getSnapshot('music')

  return (
    <div>
      <PageHeader title="Music" subtitle="Gigs · Socials · Lost River Fleet" />
      {!data && (
        <p className="text-sm text-dim">Waiting for MusicAgent to post data.</p>
      )}
    </div>
  )
}
