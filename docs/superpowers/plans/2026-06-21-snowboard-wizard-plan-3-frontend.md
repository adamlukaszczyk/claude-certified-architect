# Snowboard Wizard — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js 14 App Router frontend for the snowboard selection wizard, wired to the existing NestJS API.

**Architecture:** Server Components load wizard questions from `@snowboard/wizard-schema` (YAML files, server-only). A `'use client'` `WizardShell` receives the serialised questions as props and uses the browser-safe `rules.ts` sub-path export to drive branching. Zustand (persisted to localStorage, 7-day expiry) owns all wizard state; the NestJS API owns scoring and recommendation creation.

**Tech Stack:** Next.js 14 App Router · Zustand · NextAuth.js v5 · Framer Motion · GSAP · react-three-fiber · Tailwind CSS · shadcn/ui (reskinned) · Jest + React Testing Library · pnpm workspaces

## Global Constraints

- All font sizes, colours, and spacing come from CSS custom properties defined in `packages/ui/src/tokens.css` — no hardcoded hex values in component files.
- Background: `#0A0E1A` · Surface: `#111827` · Primary: `#7DD3FC` · CTA: `#F59E0B` · Mono: `#06B6D4`
- Display font: Monument Extended · Body: Geist · Monospace spec values: JetBrains Mono
- API base URL from `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:3001`); all paths prefixed with `/api`
- Guest session ID: UUID v4 stored in `localStorage` under key `wizard_session_id`, generated once and never rotated (rotation happens server-side on login)
- `pnpm` for all installs. Run from `91_snowboard_wizard/` root unless noted.
- All `pnpm --filter @snowboard/web test` runs must pass before any commit.

---

## File Map

```
packages/
  ui/
    package.json                        MODIFY — add deps + scripts
    tsconfig.json                       CREATE
    src/
      index.ts                          CREATE — re-exports
      tokens.css                        CREATE — CSS custom properties
      components/
        Button.tsx                      CREATE
        Card.tsx                        CREATE
        Badge.tsx                       CREATE
        Drawer.tsx                      CREATE
  wizard-schema/
    package.json                        MODIFY — add /rules sub-path export

apps/web/
  package.json                          MODIFY — full Next.js deps + Jest config
  next.config.ts                        CREATE
  tailwind.config.ts                    CREATE
  tsconfig.json                         CREATE
  jest.config.ts                        CREATE
  jest.setup.ts                         CREATE
  .env.local.example                    CREATE
  app/
    layout.tsx                          CREATE — root layout + providers
    providers.tsx                       CREATE — SessionProvider wrapper
    globals.css                         CREATE — Tailwind + token imports
    page.tsx                            CREATE — landing page
    actions.ts                          CREATE — Server Actions (auth)
    wizard/
      page.tsx                          CREATE — Server Component, loads questions
    result/
      [share_token]/
        page.tsx                        CREATE — SSR result page
    dashboard/
      page.tsx                          CREATE — saved sessions (auth-gated)
    api/
      auth/
        [...nextauth]/
          route.ts                      CREATE — NextAuth handler
  components/
    layout/
      Header.tsx                        CREATE
      AuthButton.tsx                    CREATE
    landing/
      HeroSection.tsx                   CREATE
      SnowScene.tsx                     CREATE — react-three-fiber snow
    wizard/
      WizardShell.tsx                   CREATE — 'use client' orchestrator
      QuestionCard.tsx                  CREATE — Framer Motion card
      OptionButton.tsx                  CREATE — answer option + ripple
      NumericInput.tsx                  CREATE — height/weight/days
      ProgressTrail.tsx                 CREATE — SVG serpentine trail
      PhaseTransition.tsx               CREATE — GSAP powder burst
      LiveScoreSidebar.tsx              CREATE — sidebar (desktop) + drawer (mobile)
    result/
      SpecSheet.tsx                     CREATE — deterministic spec display
      NarrativePanel.tsx                CREATE — word-by-word narrative
      RefinementPanel.tsx               CREATE — accordion of answered questions
      SavePrompt.tsx                    CREATE — lift-chair save CTA
  lib/
    api-client.ts                       CREATE — typed fetch wrappers
    auth.ts                             CREATE — NextAuth v5 config
    session-id.ts                       CREATE — guest UUID utility
  store/
    wizard-store.ts                     CREATE — Zustand store
  __tests__/
    store/wizard-store.test.ts          CREATE
    lib/api-client.test.ts              CREATE
    components/wizard/QuestionCard.test.tsx   CREATE
    components/result/SpecSheet.test.tsx      CREATE
    components/result/RefinementPanel.test.tsx CREATE
```

---

### Task 1: `packages/ui` design system + `apps/web` scaffold

**Files:**
- Modify: `packages/wizard-schema/package.json`
- Modify: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/tokens.css`
- Create: `packages/ui/src/components/Button.tsx`
- Create: `packages/ui/src/components/Card.tsx`
- Create: `packages/ui/src/components/Badge.tsx`
- Create: `packages/ui/src/components/Drawer.tsx`
- Create: `packages/ui/src/index.ts`
- Modify: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/jest.config.ts`
- Create: `apps/web/jest.setup.ts`
- Create: `apps/web/.env.local.example`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/providers.tsx`

**Interfaces:**
- Produces: `Button`, `Card`, `Badge`, `Drawer` from `@snowboard/ui`; working `pnpm --filter @snowboard/web build` and `test` scripts

- [ ] **Step 1: Add `/rules` sub-path export to `packages/wizard-schema/package.json`**

```json
{
  "name": "@snowboard/wizard-schema",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./rules": {
      "types": "./dist/rules.d.ts",
      "default": "./dist/rules.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@snowboard/types": "workspace:*",
    "js-yaml": "^4.1.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^26.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.6.0"
  },
  "jest": {
    "testEnvironment": "node",
    "testPathIgnorePatterns": ["/node_modules/", "/dist/"],
    "transform": { "^.+\\.tsx?$": ["ts-jest", {}] },
    "moduleNameMapper": { "^@snowboard/types$": "<rootDir>/../types/src/index.ts" }
  }
}
```

- [ ] **Step 2: Install and configure `packages/ui`**

Replace `packages/ui/package.json`:
```json
{
  "name": "@snowboard/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5.6.0"
  }
}
```

Create `packages/ui/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "bundler",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create design token CSS variables**

Create `packages/ui/src/tokens.css`:
```css
:root {
  --color-bg: #0A0E1A;
  --color-surface: #111827;
  --color-primary: #7DD3FC;
  --color-secondary: #F0F4FF;
  --color-edge: #06B6D4;
  --color-cta: #F59E0B;
  --color-text: #F0F4FF;
  --color-muted: #6B7280;
  --color-border: #1F2937;

  --font-display: 'Monument Extended', sans-serif;
  --font-body: 'Geist', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}
```

- [ ] **Step 4: Create `packages/ui` components**

Create `packages/ui/src/components/Button.tsx`:
```tsx
import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: React.ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[var(--color-cta)] text-[var(--color-bg)] hover:opacity-90',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10',
  ghost: 'bg-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[var(--radius-md)] px-6 py-3 font-semibold transition-all duration-150 disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
```

Create `packages/ui/src/components/Card.tsx`:
```tsx
import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 ${className}`}
    >
      {children}
    </div>
  )
}
```

Create `packages/ui/src/components/Badge.tsx`:
```tsx
import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--color-primary)] px-3 py-1 text-xs font-medium text-[var(--color-primary)] ${className}`}
    >
      {children}
    </span>
  )
}
```

Create `packages/ui/src/components/Drawer.tsx`:
```tsx
'use client'
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[var(--radius-lg)] bg-[var(--color-surface)] border-t border-[var(--color-border)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

Create `packages/ui/src/index.ts`:
```ts
export { Button } from './components/Button'
export { Card } from './components/Card'
export { Badge } from './components/Badge'
export { Drawer } from './components/Drawer'
```

- [ ] **Step 5: Install Next.js deps in `apps/web`**

Replace `apps/web/package.json`:
```json
{
  "name": "@snowboard/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@snowboard/types": "workspace:*",
    "@snowboard/ui": "workspace:*",
    "@snowboard/wizard-schema": "workspace:*",
    "next": "14.2.29",
    "next-auth": "^5.0.0-beta.28",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0",
    "framer-motion": "^11.0.0",
    "gsap": "^3.12.0",
    "@react-three/fiber": "^8.0.0",
    "@react-three/drei": "^9.0.0",
    "three": "^0.168.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/three": "^0.168.0",
    "autoprefixer": "^10.4.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterFramework": ["<rootDir>/jest.setup.ts"],
    "transform": {
      "^.+\\.(ts|tsx)$": ["ts-jest", { "tsconfig": "<rootDir>/tsconfig.json" }]
    },
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1",
      "^@snowboard/types$": "<rootDir>/../../packages/types/src/index.ts",
      "^@snowboard/ui$": "<rootDir>/../../packages/ui/src/index.ts",
      "^@snowboard/wizard-schema$": "<rootDir>/../../packages/wizard-schema/src/index.ts",
      "^@snowboard/wizard-schema/rules$": "<rootDir>/../../packages/wizard-schema/src/rules.ts"
    },
    "testPathIgnorePatterns": ["/node_modules/", "/.next/"]
  }
}
```

Run from `91_snowboard_wizard/`:
```bash
pnpm install
```

- [ ] **Step 6: Create Next.js config**

Create `apps/web/next.config.ts`:
```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@snowboard/ui'],
  serverExternalPackages: ['@snowboard/wizard-schema'],
  experimental: {
    typedRoutes: true,
  },
}

export default config
```

- [ ] **Step 7: Create Tailwind config**

Create `apps/web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        edge: 'var(--color-edge)',
        cta: 'var(--color-cta)',
      },
      fontFamily: {
        display: ['Monument Extended', 'sans-serif'],
        body: ['Geist', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 8: Create tsconfig and Jest setup**

Create `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "allowJs": true,
    "incremental": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@snowboard/wizard-schema/rules": ["../../packages/wizard-schema/src/rules.ts"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": [".", "**/*.ts", "**/*.tsx", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/jest.config.ts`:
```ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.json', useESM: false }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@snowboard/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@snowboard/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@snowboard/wizard-schema$': '<rootDir>/../../packages/wizard-schema/src/index.ts',
    '^@snowboard/wizard-schema/rules$': '<rootDir>/../../packages/wizard-schema/src/rules.ts',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
}

export default config
```

Create `apps/web/jest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Create `apps/web/__mocks__/styleMock.ts`:
```ts
export default {}
```

- [ ] **Step 9: Create globals.css and root layout**

Create `apps/web/app/globals.css`:
```css
@import '../../packages/ui/src/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* Noise grain overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 128px 128px;
}
```

Create `apps/web/app/providers.tsx`:
```tsx
'use client'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export function Providers({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
```

Create `apps/web/app/layout.tsx`:
```tsx
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
```

Create `apps/web/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
AUTH_SECRET=replace-with-at-least-32-random-chars
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret
API_URL=http://localhost:3001
```

- [ ] **Step 10: Write a smoke test to verify Jest is configured**

Create `apps/web/__tests__/smoke.test.ts`:
```ts
describe('Jest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 11: Run test and verify it passes**

```bash
pnpm --filter @snowboard/web test
```

Expected: PASS `__tests__/smoke.test.ts`

- [ ] **Step 12: Commit**

```bash
git add packages/wizard-schema/package.json packages/ui apps/web/package.json apps/web/next.config.ts apps/web/tailwind.config.ts apps/web/tsconfig.json apps/web/jest.config.ts apps/web/jest.setup.ts apps/web/__mocks__ apps/web/app/globals.css apps/web/app/layout.tsx apps/web/app/providers.tsx apps/web/.env.local.example
git commit -m "feat(web): scaffold Next.js 14 app with design system, Tailwind tokens, and Jest

AI_ASSISTED"
```

---

### Task 2: Zustand wizard store + guest session ID

**Files:**
- Create: `apps/web/lib/session-id.ts`
- Create: `apps/web/store/wizard-store.ts`
- Create: `apps/web/__tests__/store/wizard-store.test.ts`

**Interfaces:**
- Consumes: `Answers`, `PartialScores`, `SpecSheet`, `Recommendation` from `@snowboard/types`
- Produces: `useWizardStore` hook with `answers`, `scores`, `currentPhase`, `currentQuestionIndex`, `recommendation`, `answerQuestion`, `editAnswer`, `setScores`, `setRecommendation`, `resetWizard`, `goBack`, `setRecalculating`

- [ ] **Step 1: Write the failing store tests**

Create `apps/web/__tests__/store/wizard-store.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react'
import { useWizardStore } from '@/store/wizard-store'

// Reset store between tests
beforeEach(() => {
  useWizardStore.getState().resetWizard()
})

describe('answerQuestion', () => {
  it('stores the answer and advances questionIndex', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
    })
    expect(result.current.answers.heightCategory).toBe('h_171_180')
    expect(result.current.currentQuestionIndex).toBe(1)
  })

  it('advances phase when questionIndex exceeds phaseSize', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.setPhaseSize(1, 2)
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.answerQuestion('weight_category', 'w_71_85')
    })
    expect(result.current.currentPhase).toBe(2)
    expect(result.current.currentQuestionIndex).toBe(0)
  })
})

describe('editAnswer', () => {
  it('updates an existing answer', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.editAnswer('height_category', 'over_190', [])
    })
    expect(result.current.answers.heightCategory).toBe('over_190')
  })

  it('prunes downstream answers when showIf rule no longer holds', () => {
    const { result } = renderHook(() => useWizardStore())

    // Simulate: style = powder (isPowderFocused = true), then taper answer recorded
    act(() => {
      result.current.answerQuestion('style', 'powder')
      result.current.answerQuestion('taper_preference', 'high_taper')
    })

    // Change style to freestyle — isPowderFocused becomes false → taper_preference should be pruned
    const mockQuestions = [
      { id: 'style', phase: 2, text: 'Style?', options: [] },
      { id: 'taper_preference', phase: 3, text: 'Taper?', showIf: 'isPowderFocused', options: [] },
    ]
    act(() => {
      result.current.editAnswer('style', 'freestyle', mockQuestions as any)
    })

    expect(result.current.answers.taperPreference).toBeUndefined()
  })
})

describe('resetWizard', () => {
  it('clears all answers and resets to phase 1', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.resetWizard()
    })
    expect(result.current.answers).toEqual({})
    expect(result.current.currentPhase).toBe(1)
    expect(result.current.currentQuestionIndex).toBe(0)
  })
})

describe('goBack', () => {
  it('decrements questionIndex when > 0', () => {
    const { result } = renderHook(() => useWizardStore())
    act(() => {
      result.current.answerQuestion('height_category', 'h_171_180')
      result.current.goBack()
    })
    expect(result.current.currentQuestionIndex).toBe(0)
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=wizard-store
```

Expected: FAIL — "Cannot find module '@/store/wizard-store'"

- [ ] **Step 3: Create session ID utility**

Create `apps/web/lib/session-id.ts`:
```ts
const SESSION_ID_KEY = 'wizard_session_id'

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  const existing = localStorage.getItem(SESSION_ID_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  localStorage.setItem(SESSION_ID_KEY, id)
  return id
}
```

- [ ] **Step 4: Create the Zustand wizard store**

Create `apps/web/store/wizard-store.ts`:
```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { rules } from '@snowboard/wizard-schema/rules'
import type { Answers, PartialScores, SpecSheet } from '@snowboard/types'
import type { Question } from '@snowboard/wizard-schema'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

type StoredRecommendation = {
  id: string
  shareToken: string
  specSheet: SpecSheet
  claudeNarrative: string | null
}

type WizardState = {
  answers: Answers
  scores: PartialScores
  currentPhase: 1 | 2 | 3 | 4
  currentQuestionIndex: number
  phaseSizes: Record<number, number>
  recommendation: StoredRecommendation | null
  isRecalculating: boolean
  lastAnsweredAt: number | null

  answerQuestion: (questionId: string, value: string | number) => void
  editAnswer: (questionId: string, value: string | number, allQuestions: Question[]) => void
  setScores: (scores: PartialScores) => void
  setRecommendation: (rec: StoredRecommendation) => void
  setPhaseSize: (phase: number, size: number) => void
  setRecalculating: (v: boolean) => void
  resetWizard: () => void
  goBack: () => void
}

const ANSWER_KEY_MAP: Record<string, keyof Answers> = {
  height_category: 'heightCategory',
  weight_category: 'weightCategory',
  boot_size: 'bootSize',
  experience: 'experience',
  stance: 'stance',
  riding_days: 'ridingDays',
  style: 'style',
  terrain_mix: 'terrainMix',
  snow_condition: 'snowCondition',
  park_feature_focus: 'parkFeatureFocus',
  switch_frequency: 'switchFrequency',
  preferred_tricks: 'preferredTricks',
  backcountry_vs_resort: 'backcountryVsResort',
  touring_needs: 'touringNeeds',
  taper_preference: 'taperPreference',
  turn_radius: 'turnRadius',
  edge_aggression: 'edgeAggression',
  groomed_off_piste_split: 'groomedOffPisteSplit',
  speed_preference: 'speedPreference',
  camber_override: 'camberOverride',
  flex_feel: 'flexFeel',
  torsional_rigidity: 'torsionalRigidity',
  base_maintenance: 'baseMaintenance',
  stance_setback: 'stanceSetback',
  budget_range: 'budgetRange',
}

function toAnswerKey(questionId: string): keyof Answers {
  return ANSWER_KEY_MAP[questionId] ?? (questionId as keyof Answers)
}

const initialState = {
  answers: {} as Answers,
  scores: {} as PartialScores,
  currentPhase: 1 as const,
  currentQuestionIndex: 0,
  phaseSizes: {} as Record<number, number>,
  recommendation: null,
  isRecalculating: false,
  lastAnsweredAt: null,
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      answerQuestion(questionId, value) {
        const { currentPhase, currentQuestionIndex, phaseSizes } = get()
        const key = toAnswerKey(questionId)
        const phaseSize = phaseSizes[currentPhase] ?? Infinity
        const isLastInPhase = currentQuestionIndex >= phaseSize - 1

        set((s) => ({
          answers: { ...s.answers, [key]: value },
          currentQuestionIndex: isLastInPhase ? 0 : s.currentQuestionIndex + 1,
          currentPhase: isLastInPhase
            ? Math.min(4, s.currentPhase + 1) as 1 | 2 | 3 | 4
            : s.currentPhase,
          lastAnsweredAt: Date.now(),
        }))
      },

      editAnswer(questionId, value, allQuestions) {
        const key = toAnswerKey(questionId)
        const updatedAnswers: Answers = { ...get().answers, [key]: value }

        // Prune downstream questions whose showIf condition no longer holds
        const changedIdx = allQuestions.findIndex((q) => q.id === questionId)
        for (let i = changedIdx + 1; i < allQuestions.length; i++) {
          const q = allQuestions[i]
          if (!q.showIf) continue
          const ruleFn = rules[q.showIf as keyof typeof rules]
          if (ruleFn && !ruleFn(updatedAnswers)) {
            const pruneKey = toAnswerKey(q.id)
            delete updatedAnswers[pruneKey]
          }
        }

        set({ answers: updatedAnswers, scores: {}, isRecalculating: true, lastAnsweredAt: Date.now() })
      },

      setScores(scores) {
        set({ scores, isRecalculating: false })
      },

      setRecommendation(rec) {
        set({ recommendation: rec })
      },

      setPhaseSize(phase, size) {
        set((s) => ({ phaseSizes: { ...s.phaseSizes, [phase]: size } }))
      },

      setRecalculating(v) {
        set({ isRecalculating: v })
      },

      resetWizard() {
        set({ ...initialState, phaseSizes: {} })
      },

      goBack() {
        const { currentQuestionIndex, currentPhase } = get()
        if (currentQuestionIndex > 0) {
          set({ currentQuestionIndex: currentQuestionIndex - 1 })
        } else if (currentPhase > 1) {
          const prevPhase = (currentPhase - 1) as 1 | 2 | 3 | 4
          const prevSize = get().phaseSizes[prevPhase] ?? 1
          set({ currentPhase: prevPhase, currentQuestionIndex: prevSize - 1 })
        }
      },
    }),
    {
      name: 'wizard-state',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const age = Date.now() - (state.lastAnsweredAt ?? 0)
        if (age > SEVEN_DAYS_MS) {
          state.resetWizard()
        }
      },
    }
  )
)
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=wizard-store
```

Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/session-id.ts apps/web/store/wizard-store.ts apps/web/__tests__/store/wizard-store.test.ts
git commit -m "feat(web): add Zustand wizard store with localStorage persist and 7-day expiry

AI_ASSISTED"
```

---

### Task 3: Typed API client

**Files:**
- Create: `apps/web/lib/api-client.ts`
- Create: `apps/web/__tests__/lib/api-client.test.ts`

**Interfaces:**
- Consumes: `Answers`, `PartialScores`, `SpecSheet`, `Recommendation` from `@snowboard/types`
- Produces: `postScore(answers) → PartialScores`, `saveSession(id, answers, phase) → void`, `getSession(id) → {answers, phase} | null`, `postRecommendation(answers, sessionName?) → RecommendationResponse`, `getByShareToken(token) → RecommendationResponse`, `postGoogleAuth(idToken, guestSessionId?) → {userId, email}`, `postLogout() → void`, `getMe() → {id, email, name, avatarUrl} | null`

- [ ] **Step 1: Write failing API client tests**

Create `apps/web/__tests__/lib/api-client.test.ts`:
```ts
import { postScore, postRecommendation, getByShareToken } from '@/lib/api-client'

const API = 'http://localhost:3001'

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('postScore', () => {
  it('calls POST /api/score and returns scores', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scores: { flex: 7, length: 3 } }),
    })

    const result = await postScore({ experience: 'advanced' })

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/api/score`,
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    )
    expect(result).toEqual({ flex: 7, length: 3 })
  })

  it('throws on non-ok response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(postScore({})).rejects.toThrow('API error 500')
  })
})

describe('getByShareToken', () => {
  it('calls GET /api/recommendations/share/:token', async () => {
    const mockRec = { id: 'abc', shareToken: 'tok', specSheet: {}, claudeNarrative: null }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockRec,
    })

    const result = await getByShareToken('tok')

    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/api/recommendations/share/tok`,
      expect.objectContaining({ credentials: 'include' })
    )
    expect(result).toEqual(mockRec)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=api-client
```

Expected: FAIL — "Cannot find module '@/lib/api-client'"

- [ ] **Step 3: Create the API client**

Create `apps/web/lib/api-client.ts`:
```ts
import type { Answers, PartialScores, SpecSheet } from '@snowboard/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json() as Promise<T>
}

export async function postScore(answers: Partial<Answers>): Promise<PartialScores> {
  const data = await apiFetch<{ scores: PartialScores }>('/api/score', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
  return data.scores
}

export async function saveSession(id: string, answers: Answers, phase: number): Promise<void> {
  await apiFetch<void>(`/api/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ answers, phase }),
  })
}

export async function getSession(id: string): Promise<{ answers: Answers; phase: number } | null> {
  try {
    return await apiFetch<{ answers: Answers; phase: number }>(`/api/sessions/${id}`)
  } catch {
    return null
  }
}

export type RecommendationResponse = {
  id: string
  sessionId: string
  specSheet: SpecSheet
  claudeNarrative: string | null
  shareToken: string
  createdAt: string
}

export async function postRecommendation(
  answers: Answers,
  sessionName?: string
): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify({ answers, sessionName }),
  })
}

export async function getByShareToken(token: string): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>(`/api/recommendations/share/${token}`)
}

export type MeResponse = { id: string; email: string; name: string | null; avatarUrl: string | null }

export async function getMe(): Promise<MeResponse | null> {
  try {
    return await apiFetch<MeResponse>('/api/auth/me')
  } catch {
    return null
  }
}

export async function postLogout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' })
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=api-client
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api-client.ts apps/web/__tests__/lib/api-client.test.ts
git commit -m "feat(web): add typed API client for NestJS endpoints

AI_ASSISTED"
```

---

### Task 4: Landing page + app shell

**Files:**
- Create: `apps/web/components/layout/Header.tsx`
- Create: `apps/web/components/layout/AuthButton.tsx`
- Create: `apps/web/components/landing/HeroSection.tsx`
- Create: `apps/web/components/landing/SnowScene.tsx`
- Create: `apps/web/app/page.tsx`

**Interfaces:**
- Consumes: `Button`, `Card` from `@snowboard/ui`; NextAuth session
- Produces: Navigable landing page with "Find Your Board" CTA linking to `/wizard`

Note: `SnowScene` uses WebGL — no automated test. Manually verify snow particles render after `docker compose up`.

- [ ] **Step 1: Create Header and AuthButton**

Create `apps/web/components/layout/AuthButton.tsx`:
```tsx
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
```

Create `apps/web/components/layout/Header.tsx`:
```tsx
import Link from 'next/link'
import { AuthButton } from './AuthButton'

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
      <Link href="/" className="font-display text-xl tracking-wider text-[var(--color-primary)]">
        SNOWBOARD WIZARD
      </Link>
      <AuthButton />
    </header>
  )
}
```

- [ ] **Step 2: Create HeroSection**

Create `apps/web/components/landing/HeroSection.tsx`:
```tsx
import Link from 'next/link'
import { Button } from '@snowboard/ui'

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <p className="text-[var(--color-primary)] text-sm tracking-[0.3em] uppercase mb-6">
        Precision Selection System
      </p>
      <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight text-[var(--color-secondary)] mb-6">
        FIND YOUR
        <br />
        <span className="text-[var(--color-primary)]">PERFECT</span>
        <br />
        BOARD
      </h1>
      <p className="max-w-lg text-[var(--color-muted)] text-lg mb-10">
        Answer 15 questions. Get a personalised spec sheet built from 70+ selection factors — from flex to taper, camber to sidecut.
      </p>
      <Link href="/wizard">
        <Button className="text-lg px-10 py-4 font-display tracking-widest">
          START THE WIZARD
        </Button>
      </Link>
    </section>
  )
}
```

- [ ] **Step 3: Create SnowScene (react-three-fiber)**

Create `apps/web/components/landing/SnowScene.tsx`:
```tsx
'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function SnowParticles() {
  const ref = useRef<THREE.Points>(null!)

  const positions = useMemo(() => {
    const arr = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20
      arr[i * 3 + 1] = Math.random() * 20 - 5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < 2000; i++) {
      pos[i * 3 + 1] -= delta * (0.3 + Math.random() * 0.3)
      if (pos[i * 3 + 1] < -5) pos[i * 3 + 1] = 15
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#7DD3FC" size={0.04} transparent opacity={0.7} />
    </points>
  )
}

export function SnowScene() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ alpha: true }}>
        <SnowParticles />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 4: Create the landing page**

Create `apps/web/app/page.tsx`:
```tsx
import { HeroSection } from '@/components/landing/HeroSection'
import { SnowScene } from '@/components/landing/SnowScene'

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SnowScene />
      <HeroSection />
    </div>
  )
}
```

- [ ] **Step 5: Run existing tests to ensure no regressions**

```bash
pnpm --filter @snowboard/web test
```

Expected: all passing

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/layout apps/web/components/landing apps/web/app/page.tsx
git commit -m "feat(web): add landing page with snow particle scene and app shell header

AI_ASSISTED"
```

---

### Task 5: Wizard question rendering — Phases 1 & 2

**Files:**
- Create: `apps/web/app/wizard/page.tsx`
- Create: `apps/web/components/wizard/WizardShell.tsx`
- Create: `apps/web/components/wizard/QuestionCard.tsx`
- Create: `apps/web/components/wizard/OptionButton.tsx`
- Create: `apps/web/components/wizard/NumericInput.tsx`
- Create: `apps/web/__tests__/components/wizard/QuestionCard.test.tsx`

**Interfaces:**
- Consumes: `Question[]` from `loadQuestions(SCHEMA_ROOT)` (server); `rules` from `@snowboard/wizard-schema/rules` (client)
- Produces: Working Phase 1 and Phase 2 wizard flow; `answerQuestion` called on each answer; `postScore` called after each answer to update sidebar scores

- [ ] **Step 1: Write failing QuestionCard tests**

Create `apps/web/__tests__/components/wizard/QuestionCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionCard } from '@/components/wizard/QuestionCard'

const mockOptionQuestion = {
  id: 'height_category',
  phase: 1 as const,
  text: 'What is your height?',
  options: [
    { id: 'h_171_180', text: '171–180 cm', weights: {} },
    { id: 'over_190', text: 'Over 190 cm', weights: {} },
  ],
}

describe('QuestionCard', () => {
  it('renders the question text', () => {
    render(<QuestionCard question={mockOptionQuestion} onAnswer={jest.fn()} onBack={jest.fn()} />)
    expect(screen.getByText('What is your height?')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(<QuestionCard question={mockOptionQuestion} onAnswer={jest.fn()} onBack={jest.fn()} />)
    expect(screen.getByText('171–180 cm')).toBeInTheDocument()
    expect(screen.getByText('Over 190 cm')).toBeInTheDocument()
  })

  it('calls onAnswer with the selected option id', async () => {
    const onAnswer = jest.fn()
    render(<QuestionCard question={mockOptionQuestion} onAnswer={onAnswer} onBack={jest.fn()} />)
    await userEvent.click(screen.getByText('171–180 cm'))
    expect(onAnswer).toHaveBeenCalledWith('height_category', 'h_171_180')
  })

  it('calls onBack when back button clicked', async () => {
    const onBack = jest.fn()
    render(<QuestionCard question={mockOptionQuestion} onAnswer={jest.fn()} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run and verify tests fail**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=QuestionCard
```

Expected: FAIL — "Cannot find module '@/components/wizard/QuestionCard'"

- [ ] **Step 3: Create OptionButton**

Create `apps/web/components/wizard/OptionButton.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface OptionButtonProps {
  id: string
  text: string
  onSelect: (id: string) => void
}

export function OptionButton({ id, text, onSelect }: OptionButtonProps) {
  const [rippleKey, setRippleKey] = useState(0)
  const [showRipple, setShowRipple] = useState(false)

  function handleClick() {
    setRippleKey((k) => k + 1)
    setShowRipple(true)
    setTimeout(() => {
      setShowRipple(false)
      onSelect(id)
    }, 300)
  }

  return (
    <button
      onClick={handleClick}
      className="relative w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4 text-left text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
    >
      <span className="relative z-10 text-base">{text}</span>

      <AnimatePresence>
        {showRipple && (
          <motion.span
            key={rippleKey}
            className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--color-primary)]/20"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ transformOrigin: 'center' }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}
```

- [ ] **Step 4: Create NumericInput**

Create `apps/web/components/wizard/NumericInput.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@snowboard/ui'
import type { NumericQuestion } from '@snowboard/wizard-schema'

interface NumericInputProps {
  question: NumericQuestion
  onAnswer: (questionId: string, value: number) => void
  onBack: () => void
}

export function NumericInput({ question, onAnswer, onBack }: NumericInputProps) {
  const [value, setValue] = useState<string>('')

  function handleSubmit() {
    const num = parseFloat(value)
    if (isNaN(num)) return
    if (question.min !== undefined && num < question.min) return
    if (question.max !== undefined && num > question.max) return
    onAnswer(question.id, num)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min={question.min}
          max={question.max}
          placeholder={`Enter ${question.unit ?? 'value'}`}
          className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] text-lg focus:border-[var(--color-primary)] focus:outline-none"
        />
        {question.unit && (
          <span className="font-mono text-[var(--color-muted)]">{question.unit}</span>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} aria-label="back">← Back</Button>
        <Button onClick={handleSubmit} disabled={!value}>Continue</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create QuestionCard**

Create `apps/web/components/wizard/QuestionCard.tsx`:
```tsx
'use client'
import { motion } from 'framer-motion'
import { OptionButton } from './OptionButton'
import { NumericInput } from './NumericInput'
import { Button } from '@snowboard/ui'
import type { Question, OptionQuestion, NumericQuestion } from '@snowboard/wizard-schema'

interface QuestionCardProps {
  question: Question
  onAnswer: (questionId: string, value: string | number) => void
  onBack: () => void
}

export function QuestionCard({ question, onAnswer, onBack }: QuestionCardProps) {
  return (
    <motion.div
      key={question.id}
      initial={{ x: 60, rotateY: 5, opacity: 0 }}
      animate={{ x: 0, rotateY: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
        <h2 className="mb-8 text-2xl font-semibold text-[var(--color-secondary)]">
          {question.text}
        </h2>

        {question.inputType === 'numeric' ? (
          <NumericInput
            question={question as NumericQuestion}
            onAnswer={onAnswer}
            onBack={onBack}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {(question as OptionQuestion).options.map((opt) => (
              <OptionButton
                key={opt.id}
                id={opt.id}
                text={opt.text}
                onSelect={(id) => onAnswer(question.id, id)}
              />
            ))}
            <Button variant="ghost" onClick={onBack} className="mt-4 self-start" aria-label="back">
              ← Back
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 6: Run QuestionCard tests and verify they pass**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=QuestionCard
```

Expected: PASS — 4 tests

- [ ] **Step 7: Create WizardShell**

Create `apps/web/components/wizard/WizardShell.tsx`:
```tsx
'use client'
import { useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { rules } from '@snowboard/wizard-schema/rules'
import { useWizardStore } from '@/store/wizard-store'
import { postScore, postRecommendation } from '@/lib/api-client'
import { getOrCreateSessionId } from '@/lib/session-id'
import { saveSession } from '@/lib/api-client'
import { QuestionCard } from './QuestionCard'
import type { Question } from '@snowboard/wizard-schema'

interface WizardShellProps {
  questions: Question[]
}

export function WizardShell({ questions }: WizardShellProps) {
  const router = useRouter()
  const {
    answers,
    currentPhase,
    currentQuestionIndex,
    setScores,
    setPhaseSize,
    setRecommendation,
    answerQuestion,
    goBack,
  } = useWizardStore()

  const visibleQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (q.phase !== currentPhase) return false
        if (!q.showIf) return true
        const fn = rules[q.showIf as keyof typeof rules]
        return fn ? fn(answers) : true
      }),
    [questions, currentPhase, answers]
  )

  useEffect(() => {
    setPhaseSize(currentPhase, visibleQuestions.length)
  }, [currentPhase, visibleQuestions.length, setPhaseSize])

  const currentQuestion = visibleQuestions[currentQuestionIndex] ?? null

  const handleAnswer = useCallback(
    async (questionId: string, value: string | number) => {
      answerQuestion(questionId, value)
      const sessionId = getOrCreateSessionId()

      const updatedAnswers = { ...answers, [questionId]: value }

      // Fire-and-forget side effects
      postScore(updatedAnswers).then(setScores).catch(() => {})
      saveSession(sessionId, updatedAnswers as any, currentPhase).catch(() => {})

      // If last question of phase 3, create recommendation
      const isPhase3Last =
        currentPhase === 3 && currentQuestionIndex === visibleQuestions.length - 1
      if (isPhase3Last) {
        try {
          const rec = await postRecommendation(updatedAnswers as any)
          setRecommendation({
            id: rec.id,
            shareToken: rec.shareToken,
            specSheet: rec.specSheet,
            claudeNarrative: rec.claudeNarrative,
          })
          router.push(`/result/${rec.shareToken}`)
        } catch (err) {
          console.error('Failed to create recommendation', err)
        }
      }
    },
    [answers, currentPhase, currentQuestionIndex, visibleQuestions.length, answerQuestion, setScores, setRecommendation, router]
  )

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <AnimatePresence mode="wait">
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswer={handleAnswer}
            onBack={goBack}
          />
        </AnimatePresence>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Create wizard page (Server Component)**

Create `apps/web/app/wizard/page.tsx`:
```tsx
import { loadQuestions, SCHEMA_ROOT } from '@snowboard/wizard-schema'
import { WizardShell } from '@/components/wizard/WizardShell'

export default function WizardPage() {
  const questions = loadQuestions(SCHEMA_ROOT)
  return <WizardShell questions={questions} />
}
```

- [ ] **Step 9: Run all tests**

```bash
pnpm --filter @snowboard/web test
```

Expected: all passing

- [ ] **Step 10: Commit**

```bash
git add apps/web/app/wizard apps/web/components/wizard/WizardShell.tsx apps/web/components/wizard/QuestionCard.tsx apps/web/components/wizard/OptionButton.tsx apps/web/components/wizard/NumericInput.tsx apps/web/__tests__/components/wizard
git commit -m "feat(web): wizard question rendering for phases 1–3 with branching logic

AI_ASSISTED"
```

---

### Task 6: Progress trail + phase transition + live score sidebar

**Files:**
- Create: `apps/web/components/wizard/ProgressTrail.tsx`
- Create: `apps/web/components/wizard/PhaseTransition.tsx`
- Create: `apps/web/components/wizard/LiveScoreSidebar.tsx`
- Modify: `apps/web/components/wizard/WizardShell.tsx` — add sidebar + transitions

**Interfaces:**
- Consumes: `useWizardStore()` for `scores`, `isRecalculating`, `currentPhase`, `currentQuestionIndex`; `phaseSizes` to calculate progress %
- Produces: Desktop sidebar + mobile bottom drawer showing live spec scores; serpentine progress trail; powder burst overlay between phases

- [ ] **Step 1: Create ProgressTrail**

Create `apps/web/components/wizard/ProgressTrail.tsx`:
```tsx
'use client'
import { motion } from 'framer-motion'

interface ProgressTrailProps {
  progress: number // 0–1
}

// SVG path approximating a serpentine mountain descent
const TRAIL_PATH = 'M 10,10 C 30,30 70,30 90,50 C 110,70 50,90 70,110 C 90,130 130,130 150,150'
const TRAIL_LENGTH = 200

export function ProgressTrail({ progress }: ProgressTrailProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="32" height="160" viewBox="0 0 160 160" className="opacity-40">
        <path d={TRAIL_PATH} stroke="var(--color-border)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <motion.path
          d={TRAIL_PATH}
          stroke="var(--color-primary)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={TRAIL_LENGTH}
          animate={{ strokeDashoffset: TRAIL_LENGTH * (1 - progress) }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      <span className="font-mono text-xs text-[var(--color-muted)]">
        {Math.round(progress * 100)}%
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create PhaseTransition (GSAP powder burst)**

Create `apps/web/components/wizard/PhaseTransition.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

interface PhaseTransitionProps {
  onComplete: () => void
}

export function PhaseTransition({ onComplete }: PhaseTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create 80 particle divs
    const particles: HTMLDivElement[] = []
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('div')
      p.className = 'absolute h-2 w-2 rounded-full bg-[#F0F4FF]'
      p.style.left = '50%'
      p.style.top = '50%'
      container.appendChild(p)
      particles.push(p)
    }

    const tl = gsap.timeline({ onComplete })
    tl.set(particles, { x: 0, y: 0, opacity: 1, scale: 0 })
    tl.to(particles, {
      x: () => (Math.random() - 0.5) * window.innerWidth * 1.5,
      y: () => (Math.random() - 0.5) * window.innerHeight * 1.5,
      scale: () => Math.random() * 2 + 0.5,
      opacity: 0,
      duration: 0.6,
      stagger: { each: 0.005, from: 'center' },
      ease: 'power2.out',
    })

    return () => {
      tl.kill()
      particles.forEach((p) => p.remove())
    }
  }, [onComplete])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
      aria-hidden
    />
  )
}
```

- [ ] **Step 3: Create LiveScoreSidebar**

Create `apps/web/components/wizard/LiveScoreSidebar.tsx`:
```tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Drawer } from '@snowboard/ui'
import { useWizardStore } from '@/store/wizard-store'
import type { PartialScores } from '@snowboard/types'

const SCORE_LABELS: Record<keyof PartialScores, string> = {
  length: 'Board Length',
  width: 'Waist Width',
  flex: 'Flex Rating',
  shape: 'Shape',
  camber: 'Camber',
  taper: 'Taper',
  sidecut: 'Sidecut',
  setback: 'Setback',
  base: 'Base Type',
  float: 'Float Priority',
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const prevRef = useRef(value)
  useEffect(() => { prevRef.current = value }, [value])

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
        <span>{label}</span>
        <motion.span
          key={value}
          className="font-mono text-[var(--color-primary)]"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {value.toFixed(1)}
        </motion.span>
      </div>
      <div className="h-1 rounded-full bg-[var(--color-border)]">
        <motion.div
          className="h-1 rounded-full bg-[var(--color-primary)]"
          animate={{ width: `${Math.min(100, Math.max(0, (value / 15) * 100))}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}

function ScoreContent() {
  const { scores, isRecalculating } = useWizardStore()
  const keys = Object.keys(scores) as (keyof PartialScores)[]

  if (keys.length === 0) {
    return (
      <p className="text-xs text-[var(--color-muted)] text-center py-4">
        Answer questions to see your live profile build up here.
      </p>
    )
  }

  return (
    <div className="relative">
      {isRecalculating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface)]/80 rounded-[var(--radius-md)]">
          <span className="text-xs text-[var(--color-primary)] animate-pulse">Recalculating…</span>
        </div>
      )}
      {keys.map((key) => (
        <ScoreBar key={key} label={SCORE_LABELS[key] ?? key} value={scores[key] ?? 0} />
      ))}
    </div>
  )
}

export function LiveScoreSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 text-xs font-semibold tracking-widest uppercase text-[var(--color-muted)]">
            Live Profile
          </h3>
          <ScoreContent />
        </div>
      </aside>

      {/* Mobile bottom drawer trigger */}
      <button
        className="fixed bottom-4 right-4 z-40 lg:hidden rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-bg)]"
        onClick={() => setDrawerOpen(true)}
      >
        Live Profile
      </button>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          <h3 className="mb-4 text-xs font-semibold tracking-widest uppercase text-[var(--color-muted)]">
            Live Profile
          </h3>
          <ScoreContent />
        </div>
      </Drawer>
    </>
  )
}
```

- [ ] **Step 4: Update WizardShell to include sidebar, progress, and phase transition**

Modify `apps/web/components/wizard/WizardShell.tsx` — replace the return statement and add state for phase transitions:

```tsx
'use client'
import { useEffect, useMemo, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { rules } from '@snowboard/wizard-schema/rules'
import { useWizardStore } from '@/store/wizard-store'
import { postScore, postRecommendation, saveSession } from '@/lib/api-client'
import { getOrCreateSessionId } from '@/lib/session-id'
import { QuestionCard } from './QuestionCard'
import { ProgressTrail } from './ProgressTrail'
import { PhaseTransition } from './PhaseTransition'
import { LiveScoreSidebar } from './LiveScoreSidebar'
import type { Question } from '@snowboard/wizard-schema'

interface WizardShellProps {
  questions: Question[]
}

export function WizardShell({ questions }: WizardShellProps) {
  const router = useRouter()
  const [showTransition, setShowTransition] = useState(false)

  const {
    answers,
    currentPhase,
    currentQuestionIndex,
    phaseSizes,
    setScores,
    setPhaseSize,
    setRecommendation,
    answerQuestion,
    goBack,
  } = useWizardStore()

  const visibleQuestions = useMemo(
    () =>
      questions.filter((q) => {
        if (q.phase !== currentPhase) return false
        if (!q.showIf) return true
        const fn = rules[q.showIf as keyof typeof rules]
        return fn ? fn(answers) : true
      }),
    [questions, currentPhase, answers]
  )

  useEffect(() => {
    setPhaseSize(currentPhase, visibleQuestions.length)
  }, [currentPhase, visibleQuestions.length, setPhaseSize])

  const totalAnswered = Object.values(phaseSizes).reduce((a, b) => a + b, 0)
  const totalQuestions = questions.length
  const progress = totalAnswered > 0 ? Math.min(1, totalAnswered / totalQuestions) : 0

  const currentQuestion = visibleQuestions[currentQuestionIndex] ?? null

  const handleAnswer = useCallback(
    async (questionId: string, value: string | number) => {
      answerQuestion(questionId, value)
      const sessionId = getOrCreateSessionId()
      const updatedAnswers = { ...answers, [questionId]: value }

      postScore(updatedAnswers).then(setScores).catch(() => {})
      saveSession(sessionId, updatedAnswers as any, currentPhase).catch(() => {})

      const isPhase3Last =
        currentPhase === 3 && currentQuestionIndex === visibleQuestions.length - 1
      const isPhaseLastQ = currentQuestionIndex === visibleQuestions.length - 1

      if (isPhase3Last) {
        setShowTransition(true)
        try {
          const rec = await postRecommendation(updatedAnswers as any)
          setRecommendation({
            id: rec.id,
            shareToken: rec.shareToken,
            specSheet: rec.specSheet,
            claudeNarrative: rec.claudeNarrative,
          })
          router.push(`/result/${rec.shareToken}`)
        } catch (err) {
          console.error('Failed to create recommendation', err)
          setShowTransition(false)
        }
      } else if (isPhaseLastQ) {
        setShowTransition(true)
      }
    },
    [answers, currentPhase, currentQuestionIndex, visibleQuestions.length, answerQuestion, setScores, setRecommendation, router]
  )

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-12">
      {showTransition && (
        <PhaseTransition onComplete={() => setShowTransition(false)} />
      )}

      <div className="mx-auto flex max-w-5xl gap-8">
        {/* Progress trail (left, desktop) */}
        <div className="hidden lg:flex flex-col items-center pt-4">
          <ProgressTrail progress={progress} />
        </div>

        {/* Question card */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
              onBack={goBack}
            />
          </AnimatePresence>
        </div>

        {/* Live score sidebar */}
        <LiveScoreSidebar />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run all tests**

```bash
pnpm --filter @snowboard/web test
```

Expected: all passing

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/wizard/ProgressTrail.tsx apps/web/components/wizard/PhaseTransition.tsx apps/web/components/wizard/LiveScoreSidebar.tsx apps/web/components/wizard/WizardShell.tsx
git commit -m "feat(web): add live score sidebar, progress trail, and phase transition animation

AI_ASSISTED"
```

---

### Task 7: Result page — SpecSheet + NarrativePanel

**Files:**
- Create: `apps/web/components/result/SpecSheet.tsx`
- Create: `apps/web/components/result/NarrativePanel.tsx`
- Create: `apps/web/app/result/[share_token]/page.tsx`
- Create: `apps/web/__tests__/components/result/SpecSheet.test.tsx`

**Interfaces:**
- Consumes: `RecommendationResponse` from `getByShareToken(token)` — SSR fetch from NestJS
- Produces: Public-accessible result page at `/result/[share_token]`

- [ ] **Step 1: Write failing SpecSheet tests**

Create `apps/web/__tests__/components/result/SpecSheet.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { SpecSheet } from '@/components/result/SpecSheet'
import type { SpecSheet as SpecSheetType } from '@snowboard/types'

const mockSpec: SpecSheetType = {
  lengthCm: 155,
  waistWidthMm: 252,
  flexRating: 7,
  flexLabel: 'Stiff',
  shape: 'Directional Twin',
  camberProfile: 'Traditional Camber',
  taperMm: 8,
  sidecutRadius: 'Medium',
  setback: 'Slight',
  baseType: 'Sintered',
  floatPriority: 'Medium',
}

describe('SpecSheet', () => {
  it('renders board length', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('155 cm')).toBeInTheDocument()
  })

  it('renders flex label', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('Stiff')).toBeInTheDocument()
  })

  it('renders shape', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('Directional Twin')).toBeInTheDocument()
  })

  it('renders camber profile', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('Traditional Camber')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and verify tests fail**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=SpecSheet
```

Expected: FAIL — "Cannot find module '@/components/result/SpecSheet'"

- [ ] **Step 3: Create SpecSheet**

Create `apps/web/components/result/SpecSheet.tsx`:
```tsx
'use client'
import { motion } from 'framer-motion'
import type { SpecSheet as SpecSheetType } from '@snowboard/types'

interface SpecSheetProps {
  spec: SpecSheetType
}

type SpecRow = { label: string; value: string }

function specRows(spec: SpecSheetType): SpecRow[] {
  return [
    { label: 'Board Length', value: `${spec.lengthCm} cm` },
    { label: 'Waist Width', value: `${spec.waistWidthMm} mm` },
    { label: 'Flex Rating', value: `${spec.flexRating}/10 — ${spec.flexLabel}` },
    { label: 'Shape', value: spec.shape },
    { label: 'Camber Profile', value: spec.camberProfile },
    { label: 'Taper', value: `${spec.taperMm} mm` },
    { label: 'Sidecut Radius', value: spec.sidecutRadius },
    { label: 'Setback', value: spec.setback },
    { label: 'Base Type', value: spec.baseType },
    { label: 'Float Priority', value: spec.floatPriority },
  ]
}

export function SpecSheet({ spec }: SpecSheetProps) {
  const rows = specRows(spec)

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="mb-6 font-display text-xl tracking-wider text-[var(--color-primary)]">
        YOUR SPEC SHEET
      </h2>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            className="flex items-center justify-between border-b border-[var(--color-border)] pb-2"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
            style={{ transformOrigin: 'left' }}
          >
            <span className="text-sm text-[var(--color-muted)]">{row.label}</span>
            <span className="font-mono text-sm text-[var(--color-secondary)]">{row.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create NarrativePanel**

Create `apps/web/components/result/NarrativePanel.tsx`:
```tsx
'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface NarrativePanelProps {
  narrative: string | null
}

export function NarrativePanel({ narrative }: NarrativePanelProps) {
  const words = useMemo(
    () => (narrative ? narrative.split(/(\s+)/) : []),
    [narrative]
  )

  if (!narrative) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-muted)] text-sm">
        Narrative analysis is being generated…
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="mb-6 font-display text-xl tracking-wider text-[var(--color-secondary)]">
        WHY THESE SPECS
      </h2>

      <p className="text-[var(--color-text)] leading-relaxed text-sm">
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ delay: i * 0.015, duration: 0.2 }}
          >
            {word}
          </motion.span>
        ))}
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Create result page (SSR Server Component)**

Create `apps/web/app/result/[share_token]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { SpecSheet } from '@/components/result/SpecSheet'
import { NarrativePanel } from '@/components/result/NarrativePanel'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

async function fetchRecommendation(token: string) {
  const res = await fetch(`${API_URL}/api/recommendations/share/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

interface Props {
  params: { share_token: string }
}

export default async function ResultPage({ params }: Props) {
  const rec = await fetchRecommendation(params.share_token)
  if (!rec) notFound()

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl tracking-wider text-[var(--color-secondary)]">
        YOUR BOARD PROFILE
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <SpecSheet spec={rec.specSheet} />
        <NarrativePanel narrative={rec.claudeNarrative} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run SpecSheet tests**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=SpecSheet
```

Expected: PASS — 4 tests

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/result/SpecSheet.tsx apps/web/components/result/NarrativePanel.tsx apps/web/app/result apps/web/__tests__/components/result/SpecSheet.test.tsx
git commit -m "feat(web): result page with spec sheet draw-in animation and narrative word reveal

AI_ASSISTED"
```

---

### Task 8: Refinement panel + SavePrompt

**Files:**
- Create: `apps/web/components/result/RefinementPanel.tsx`
- Create: `apps/web/components/result/SavePrompt.tsx`
- Modify: `apps/web/app/result/[share_token]/page.tsx` — add RefinementPanel and SavePrompt
- Create: `apps/web/__tests__/components/result/RefinementPanel.test.tsx`

**Interfaces:**
- Consumes: `Question[]` (loaded server-side and passed as prop); `useWizardStore()` for `answers`, `editAnswer`, `setScores`
- Produces: Accordion of answered questions; editing any answer prunes downstream and re-scores; SavePrompt triggers Google OAuth

- [ ] **Step 1: Write failing RefinementPanel tests**

Create `apps/web/__tests__/components/result/RefinementPanel.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefinementPanel } from '@/components/result/RefinementPanel'
import { useWizardStore } from '@/store/wizard-store'

const mockQuestions = [
  {
    id: 'height_category',
    phase: 1 as const,
    text: 'What is your height?',
    options: [
      { id: 'h_171_180', text: '171–180 cm', weights: {} },
      { id: 'over_190', text: 'Over 190 cm', weights: {} },
    ],
  },
]

beforeEach(() => {
  useWizardStore.getState().resetWizard()
  useWizardStore.getState().answerQuestion('height_category', 'h_171_180')
})

describe('RefinementPanel', () => {
  it('renders the answered question text', () => {
    render(<RefinementPanel questions={mockQuestions as any} />)
    expect(screen.getByText('What is your height?')).toBeInTheDocument()
  })

  it('shows current answer', () => {
    render(<RefinementPanel questions={mockQuestions as any} />)
    expect(screen.getByText('171–180 cm')).toBeInTheDocument()
  })

  it('clicking an option calls editAnswer on the store', async () => {
    const spy = jest.spyOn(useWizardStore.getState(), 'editAnswer')
    render(<RefinementPanel questions={mockQuestions as any} />)

    // Expand accordion
    await userEvent.click(screen.getByText('What is your height?'))
    await userEvent.click(screen.getByText('Over 190 cm'))

    expect(spy).toHaveBeenCalledWith('height_category', 'over_190', mockQuestions)
  })
})
```

- [ ] **Step 2: Run and verify tests fail**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=RefinementPanel
```

Expected: FAIL

- [ ] **Step 3: Create RefinementPanel**

Create `apps/web/components/result/RefinementPanel.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWizardStore } from '@/store/wizard-store'
import { postScore } from '@/lib/api-client'
import type { Question, OptionQuestion } from '@snowboard/wizard-schema'
import type { Answers } from '@snowboard/types'

interface RefinementPanelProps {
  questions: Question[]
}

const ANSWER_KEY_MAP: Record<string, keyof Answers> = {
  height_category: 'heightCategory',
  weight_category: 'weightCategory',
  boot_size: 'bootSize',
  experience: 'experience',
  stance: 'stance',
  riding_days: 'ridingDays',
  style: 'style',
  terrain_mix: 'terrainMix',
  snow_condition: 'snowCondition',
  park_feature_focus: 'parkFeatureFocus',
  switch_frequency: 'switchFrequency',
  preferred_tricks: 'preferredTricks',
  backcountry_vs_resort: 'backcountryVsResort',
  touring_needs: 'touringNeeds',
  taper_preference: 'taperPreference',
  turn_radius: 'turnRadius',
  edge_aggression: 'edgeAggression',
  groomed_off_piste_split: 'groomedOffPisteSplit',
  speed_preference: 'speedPreference',
  camber_override: 'camberOverride',
  flex_feel: 'flexFeel',
  torsional_rigidity: 'torsionalRigidity',
  base_maintenance: 'baseMaintenance',
  stance_setback: 'stanceSetback',
  budget_range: 'budgetRange',
}

function getAnswerValue(answers: Answers, questionId: string): string | number | undefined {
  const key = ANSWER_KEY_MAP[questionId] ?? (questionId as keyof Answers)
  return answers[key] as string | number | undefined
}

export function RefinementPanel({ questions }: RefinementPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { answers, editAnswer, setScores } = useWizardStore()

  const answeredQuestions = questions.filter(
    (q) => getAnswerValue(answers, q.id) !== undefined
  )

  function handleEdit(questionId: string, value: string | number) {
    editAnswer(questionId, value, questions)
    postScore(useWizardStore.getState().answers).then(setScores).catch(() => {})
    setExpandedId(null)
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h3 className="mb-4 font-display text-sm tracking-wider uppercase text-[var(--color-muted)]">
        Refine Your Answers
      </h3>

      <div className="flex flex-col gap-2">
        {answeredQuestions.map((q) => {
          const current = getAnswerValue(answers, q.id)
          const isExpanded = expandedId === q.id
          const optQ = q as OptionQuestion
          const currentLabel = optQ.options?.find((o) => o.id === current)?.text ?? String(current)

          return (
            <div key={q.id} className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--color-primary)]/5 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
              >
                <span className="text-[var(--color-text)]">{q.text}</span>
                <span className="text-[var(--color-primary)] font-mono text-xs">{currentLabel}</span>
              </button>

              <AnimatePresence>
                {isExpanded && optQ.options && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 px-4 pb-4">
                      {optQ.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleEdit(q.id, opt.id)}
                          className={`w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--color-primary)]/10 ${
                            opt.id === current
                              ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'text-[var(--color-muted)]'
                          }`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SavePrompt**

Create `apps/web/components/result/SavePrompt.tsx`:
```tsx
'use client'
import { signIn, useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@snowboard/ui'
import { useWizardStore } from '@/store/wizard-store'
import { authenticateWithNestJs } from '@/app/actions'
import { getOrCreateSessionId } from '@/lib/session-id'

export function SavePrompt() {
  const { data: session } = useSession()
  const { recommendation } = useWizardStore()

  if (session?.user || !recommendation) return null

  async function handleSave() {
    const guestSessionId = getOrCreateSessionId()
    await signIn('google', { callbackUrl: `/result/${recommendation!.shareToken}?saved=1` })
    // After redirect back, actions.ts will exchange the Google token with NestJS
    await authenticateWithNestJs(guestSessionId)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200, damping: 25 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4"
      >
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-cta)]/30 bg-[var(--color-surface)] p-5 shadow-2xl shadow-[var(--color-cta)]/10">
          <p className="text-sm text-[var(--color-secondary)] font-semibold mb-1">
            Save your spec sheet
          </p>
          <p className="text-xs text-[var(--color-muted)] mb-4">
            Sign in to save, reload, and share your board profile.
          </p>
          <Button onClick={handleSave} className="w-full">
            Save with Google
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 5: Update result page to include RefinementPanel and SavePrompt**

Modify `apps/web/app/result/[share_token]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { loadQuestions, SCHEMA_ROOT } from '@snowboard/wizard-schema'
import { SpecSheet } from '@/components/result/SpecSheet'
import { NarrativePanel } from '@/components/result/NarrativePanel'
import { RefinementPanel } from '@/components/result/RefinementPanel'
import { SavePrompt } from '@/components/result/SavePrompt'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

async function fetchRecommendation(token: string) {
  const res = await fetch(`${API_URL}/api/recommendations/share/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

interface Props {
  params: { share_token: string }
}

export default async function ResultPage({ params }: Props) {
  const [rec, questions] = await Promise.all([
    fetchRecommendation(params.share_token),
    Promise.resolve(loadQuestions(SCHEMA_ROOT)),
  ])
  if (!rec) notFound()

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl tracking-wider text-[var(--color-secondary)]">
        YOUR BOARD PROFILE
      </h1>

      <div className="grid gap-6 lg:grid-cols-2 mb-10">
        <SpecSheet spec={rec.specSheet} />
        <NarrativePanel narrative={rec.claudeNarrative} />
      </div>

      <RefinementPanel questions={questions} />
      <SavePrompt />
    </div>
  )
}
```

- [ ] **Step 6: Run RefinementPanel tests**

```bash
pnpm --filter @snowboard/web test -- --testPathPattern=RefinementPanel
```

Expected: PASS — 3 tests

- [ ] **Step 7: Run full test suite**

```bash
pnpm --filter @snowboard/web test
```

Expected: all passing

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/result/RefinementPanel.tsx apps/web/components/result/SavePrompt.tsx apps/web/app/result apps/web/__tests__/components/result/RefinementPanel.test.tsx
git commit -m "feat(web): refinement panel with downstream pruning and save prompt

AI_ASSISTED"
```

---

### Task 9: NextAuth.js Google OAuth + NestJS token exchange + saved sessions dashboard

**Files:**
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/app/actions.ts`
- Create: `apps/web/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `API_URL` from env; `POST /api/auth/google` on NestJS to exchange ID token for JWT cookies
- Produces: Working Google sign-in; NestJS JWT cookies set after exchange; `/dashboard` showing saved sessions for authenticated users

- [ ] **Step 1: Create NextAuth config**

Create `apps/web/lib/auth.ts`:
```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Extend NextAuth types to store idToken
declare module 'next-auth' {
  interface Session {
    idToken?: string
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
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
      if (account?.id_token) {
        token.idToken = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      session.idToken = token.idToken
      return session
    },
  },
})
```

- [ ] **Step 2: Create NextAuth route handler**

Create `apps/web/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 3: Create Server Actions**

Create `apps/web/app/actions.ts`:
```ts
'use server'
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) return { ok: false, error: `NestJS auth failed: ${res.status}` }

  // Forward httpOnly cookies from NestJS to browser
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
```

- [ ] **Step 4: Create saved sessions dashboard**

Create `apps/web/app/dashboard/page.tsx`:
```tsx
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

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/api/auth/signin')

  const cookieStore = cookies()
  const accessToken = cookieStore.get('access_token')?.value ?? ''
  const savedSessions = await fetchSessions(accessToken).catch(() => [])

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
          {savedSessions.map((s: { id: string; name: string | null; completedAt: string | null; shareToken?: string }) => (
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
```

- [ ] **Step 5: Run full test suite to ensure no regressions**

```bash
pnpm --filter @snowboard/web test
```

Expected: all passing

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @snowboard/web typecheck
```

Expected: no errors (or note any type issues to fix)

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/auth.ts apps/web/app/api apps/web/app/actions.ts apps/web/app/dashboard
git commit -m "feat(web): NextAuth Google OAuth with NestJS JWT exchange and saved sessions dashboard

AI_ASSISTED"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Spec requirement | Covered in task |
|---|---|
| Landing page with dark pre-dawn aesthetic | Task 4 |
| Snow particle ambient scene (r3f) | Task 4 |
| Phase 1–4 wizard questions | Task 5 |
| Branching via TypeScript rules | Task 5 |
| Progress serpentine trail | Task 6 |
| Phase transition powder burst (GSAP) | Task 6 |
| Live score sidebar / mobile drawer | Task 6 |
| Number scramble on score update | Task 6 (motion key-based animation) |
| Zustand store persisted 7-day localStorage | Task 2 |
| POST /api/score after each answer | Tasks 5, 6 |
| Result page: spec sheet + Claude narrative | Task 7 |
| Spec sheet draw-in animation (carving tracks) | Task 7 |
| Word-by-word narrative reveal (frost clear) | Task 7 |
| Refinement panel accordion | Task 8 |
| Downstream answer pruning on edit | Task 8 |
| Save prompt (lift-chair animation) | Task 8 |
| Google OAuth (NextAuth) | Task 9 |
| NestJS JWT exchange server-side | Task 9 |
| Guest session claim on login | Task 9 (guestSessionId passed to actions.ts) |
| Saved sessions dashboard | Task 9 |
| Share URL `/result/[share_token]` SSR | Task 7 |
| Mobile responsive: stacked spec sheet | Task 7 (lg:grid-cols-2) |
| Mobile responsive: bottom drawer for score panel | Task 6 |
| Font: Monument Extended / Geist / JetBrains Mono | Task 1 (tailwind config + tokens.css) |
| Noise grain texture on surfaces | Task 1 (globals.css ::after) |
| Framer Motion spring physics stiffness:300 damping:25 | Task 5 (QuestionCard) |
| GSAP 600ms powder burst | Task 6 (PhaseTransition) |
| CSS design tokens from packages/ui | Task 1 |
| PDF download button | Not in plan — `GET /api/recommendations/:id/pdf` returns 501; deferred per API plan |
| Phase 4 (advanced refinement opt-in) | Questions loaded; shown after Phase 3 completion via wizard flow (no separate routing needed) |

**Gaps identified:**
- Phase 4 entry point: after the result page, a "Refine further" button should navigate the user back to `/wizard` at phase 4. Add to Task 8 as a `<Link href="/wizard">Refine Further</Link>` button on the result page.
- PDF download: the result page should show a disabled PDF button with "Coming soon" since `GET /api/recommendations/:id/pdf` returns 501.
- Question card exit animation "motion blur trail": the current QuestionCard exit only has `x: -60` — add `filter: 'blur(4px)'` on exit to approximate the spec's "cuts left with motion blur trail."

**Placeholder scan:** None found — all steps have complete code.

**Type consistency check:**
- `ANSWER_KEY_MAP` is duplicated in `wizard-store.ts` and `RefinementPanel.tsx`. Extract to `lib/answer-key-map.ts` and import in both. Add this as a fix before Task 3 commit: create `apps/web/lib/answer-key-map.ts` with the exported map, and update imports in both files.

**Fix for type consistency:** Before the Task 3 commit, create:

`apps/web/lib/answer-key-map.ts`:
```ts
import type { Answers } from '@snowboard/types'

export const ANSWER_KEY_MAP: Record<string, keyof Answers> = {
  height_category: 'heightCategory',
  weight_category: 'weightCategory',
  boot_size: 'bootSize',
  experience: 'experience',
  stance: 'stance',
  riding_days: 'ridingDays',
  style: 'style',
  terrain_mix: 'terrainMix',
  snow_condition: 'snowCondition',
  park_feature_focus: 'parkFeatureFocus',
  switch_frequency: 'switchFrequency',
  preferred_tricks: 'preferredTricks',
  backcountry_vs_resort: 'backcountryVsResort',
  touring_needs: 'touringNeeds',
  taper_preference: 'taperPreference',
  turn_radius: 'turnRadius',
  edge_aggression: 'edgeAggression',
  groomed_off_piste_split: 'groomedOffPisteSplit',
  speed_preference: 'speedPreference',
  camber_override: 'camberOverride',
  flex_feel: 'flexFeel',
  torsional_rigidity: 'torsionalRigidity',
  base_maintenance: 'baseMaintenance',
  stance_setback: 'stanceSetback',
  budget_range: 'budgetRange',
}

export function toAnswerKey(questionId: string): keyof Answers {
  return ANSWER_KEY_MAP[questionId] ?? (questionId as keyof Answers)
}
```

Then update `wizard-store.ts` and `RefinementPanel.tsx` to `import { toAnswerKey, ANSWER_KEY_MAP } from '@/lib/answer-key-map'` and remove the local copies.
