import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import AgentStatus from '@/components/AgentStatus'
import MobileHeader from '@/components/MobileHeader'
import Clock from '@/components/Clock'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Berns Dashboard',
  description: 'Personal OS — finance, classes, research',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-200">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex fixed left-0 top-0 h-screen w-48 bg-panel border-r border-border flex-col z-10">
          <Sidebar />
          <Clock />
          <AgentStatus />
        </aside>

        {/* Mobile top bar + drawer */}
        <MobileHeader />

        <main className="md:ml-48 min-h-screen p-5 md:p-10 pt-16 md:pt-10 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  )
}
