// auth.ts - NextAuth.js v5 configuration with Google OAuth provider
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Extend Session type to surface idToken for server actions (never sent to client)
declare module 'next-auth' {
  interface Session {
    idToken?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: { params: { access_type: 'offline', prompt: 'consent' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Store Google id_token in JWT on first sign-in — never exposed to client
      if (account?.id_token) {
        token['idToken'] = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      // Make idToken available to server actions via auth()
      const idToken = token['idToken']
      if (typeof idToken === 'string') {
        session.idToken = idToken
      }
      return session
    },
  },
})
