import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Berns Dashboard',
  description: 'Personal OS — finance, classes, research, music',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-200">
        <Sidebar />
        <main className="ml-48 min-h-screen p-10 max-w-6xl">
          {children}
        </main>
      </body>
    </html>
  )
}
