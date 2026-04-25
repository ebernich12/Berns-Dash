import PageHeader from '@/components/PageHeader'
import { getSnapshot } from '@/lib/db'
import { fmtDateTimeET } from '@/lib/time'
import NewsClient from './NewsClient'

export const dynamic = 'force-dynamic'

export default async function NewsPage() {
  const [markets, world, tech, macro, analysis] = await Promise.all([
    getSnapshot('news-markets'),
    getSnapshot('news-world'),
    getSnapshot('news-tech'),
    getSnapshot('news-macro'),
    getSnapshot('news-analysis'),
  ])

  const ts = analysis?.updated_at ?? markets?.updated_at ?? world?.updated_at ?? null

  return (
    <div>
      <PageHeader
        title="News & Intelligence"
        subtitle={ts ? `Updated ${fmtDateTimeET(ts)} ET` : 'Agents warming up'}
      />
      <NewsClient
        markets={markets}
        world={world}
        tech={tech}
        macro={macro}
        analysis={analysis}
      />
    </div>
  )
}
