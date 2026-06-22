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
