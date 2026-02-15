import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Xumiiro Agent',
  description: 'Xumiiro Digital Art Concierge',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
