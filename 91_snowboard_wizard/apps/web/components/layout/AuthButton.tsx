'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@snowboard/ui'

export function AuthButton() {
  const { data: session } = useSession()

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          <img src={session.user.image} alt={session.user.name ?? ''} className="h-8 w-8 rounded-full" />
        )}
        <Button variant="ghost" onClick={() => signOut()}>Sign out</Button>
      </div>
    )
  }

  return (
    <Button variant="secondary" onClick={() => signIn('google')}>
      Sign in with Google
    </Button>
  )
}
