import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { Providers } from './providers'
import { Header } from '@/components/layout/Header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Snowboard Wizard',
  description: 'Find your perfect board',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en">
      <body>
        <Providers session={session}>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
