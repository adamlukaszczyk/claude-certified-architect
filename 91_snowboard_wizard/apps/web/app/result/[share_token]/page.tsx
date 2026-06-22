// page.tsx - Result page: renders spec sheet, narrative, refinement panel, and save prompt
import { notFound } from 'next/navigation'
import { getByShareToken } from '@/lib/api-client'
import { SpecSheet } from '@/components/result/SpecSheet'
import { NarrativePanel } from '@/components/result/NarrativePanel'
import { RefinementPanel } from '@/components/result/RefinementPanel'
import { SavePrompt } from '@/components/result/SavePrompt'
import { loadQuestions, SCHEMA_ROOT } from '@snowboard/wizard-schema'

interface Props {
  params: { share_token: string }
}

export default async function ResultPage({ params }: Props) {
  const [rec, questions] = await Promise.all([
    getByShareToken(params.share_token).catch(() => null),
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
