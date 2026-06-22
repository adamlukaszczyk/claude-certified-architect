'use server'
// actions.ts - Server actions for NestJS auth exchange and logout
import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export async function authenticateWithNestJs(guestSessionId?: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  const idToken = session?.idToken
  if (!idToken) return { ok: false, error: 'Not authenticated with Google' }

  const body: Record<string, string> = { idToken }
  if (guestSessionId) body.guestSessionId = guestSessionId

  const res = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (!res.ok) return { ok: false, error: `NestJS auth failed: ${res.status}` }

  // Forward httpOnly cookies from NestJS response to the browser
  const cookieStore = cookies()
  const setCookies = res.headers.getSetCookie?.() ?? []
  for (const cookieStr of setCookies) {
    const parts = cookieStr.split('; ')
    const [nameValue] = parts
    const eqIdx = nameValue.indexOf('=')
    const name = nameValue.slice(0, eqIdx)
    const value = nameValue.slice(eqIdx + 1)
    cookieStore.set(name, value, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: name === 'access_token' ? 15 * 60 : 30 * 24 * 60 * 60,
    })
  }

  return { ok: true }
}

export async function logoutFromNestJs(): Promise<void> {
  const cookieStore = cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value

  if (refreshToken) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
    }).catch(() => {})
  }

  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}
