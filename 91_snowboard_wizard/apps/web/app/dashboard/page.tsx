// dashboard/page.tsx - Saved sessions dashboard (Server Component)
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, Badge, Button } from '@snowboard/ui'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

async function fetchSessions(accessToken: string) {
  const res = await fetch(`${API_URL}/api/sessions`, {
    headers: { Authorization: `Bearer ${accessToken}`, Cookie: `access_token=${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

type SavedSession = {
  id: string
  name: string | null
  completedAt: string | null
  shareToken?: string
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const cookieStore = cookies()
  const accessToken = cookieStore.get('access_token')?.value ?? ''
  const savedSessions: SavedSession[] = await fetchSessions(accessToken).catch(() => [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-wider text-[var(--color-secondary)]">
          YOUR PROFILES
        </h1>
        <Link href="/wizard">
          <Button>New Wizard</Button>
        </Link>
      </div>

      {savedSessions.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--color-muted)] mb-4">No saved profiles yet.</p>
          <Link href="/wizard">
            <Button variant="secondary">Start the Wizard</Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {savedSessions.map((s) => (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--color-text)]">
                  {s.name ?? 'Unnamed session'}
                </p>
                {s.completedAt && (
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    {new Date(s.completedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {s.completedAt ? (
                  <Badge>Complete</Badge>
                ) : (
                  <Badge className="border-[var(--color-cta)] text-[var(--color-cta)]">In Progress</Badge>
                )}
                {s.shareToken && (
                  <Link href={`/result/${s.shareToken}`}>
                    <Button variant="secondary" className="text-xs px-3 py-2">View</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
