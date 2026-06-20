// types.ts - Wizard-schema-specific types (question shape, scoring mappings)

import type { SpecScores, Answers } from '@snowboard/types'

export type Option = {
  id: string
  text: string
  weights: Partial<SpecScores>
}

export type QuestionInputType = 'single' | 'multi' | 'numeric'

export type Question = {
  id: string
  phase: 1 | 2 | 3 | 4
  text: string
  showIf?: string           // must be a key in rules.ts at runtime
  inputType?: QuestionInputType  // default: 'single'
  answersKey?: keyof Answers  // for numeric inputs, which Answers field to set
  options?: Option[]
  min?: number              // for numeric inputs
  max?: number
  unit?: string
}

export type ScoreRange = [number, number]

export type ScoreMapping = {
  scoreRange: ScoreRange
  value: number | string
  label: string
  description: string
}

export type ScoringTable = {
  dimension: keyof SpecScores
  mappings: ScoreMapping[]
}
