import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Umbrella AI',
  description: 'AI agents that capture, qualify, and convert — with an intelligence layer that tells them what to look for next.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
