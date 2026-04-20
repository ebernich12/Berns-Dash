import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import AgentStatus from '@/components/AgentStatus'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Berns Dashboard',
  description: 'Personal OS — finance, classes, research',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-200">
        <aside className="fixed left-0 top-0 h-screen w-48 bg-panel border-r border-border flex flex-col z-10">
          <Sidebar />
          <AgentStatus />
        </aside>
        <main className="ml-48 min-h-screen p-10 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  )
}
