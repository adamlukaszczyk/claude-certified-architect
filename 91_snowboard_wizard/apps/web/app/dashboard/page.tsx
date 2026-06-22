// dashboard/page.tsx - User dashboard (Server Component)
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, Button } from '@snowboard/ui'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const { name, email, image } = session.user

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

      <div className="mb-8 flex items-center gap-4">
        {image && (
          <img src={image} alt={name ?? ''} className="h-14 w-14 rounded-full" />
        )}
        <div>
          {name && <p className="font-semibold text-[var(--color-text)]">{name}</p>}
          {email && <p className="text-sm text-[var(--color-muted)]">{email}</p>}
        </div>
      </div>

      <Card className="text-center py-12">
        <p className="text-[var(--color-muted)] mb-4">
          You have no saved results yet. Complete the wizard to get a recommendation.
        </p>
        <Link href="/wizard">
          <Button variant="secondary">Start the Wizard</Button>
        </Link>
      </Card>
    </div>
  )
}
