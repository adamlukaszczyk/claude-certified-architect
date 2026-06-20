// types.ts - Wizard-schema-specific types (question shape, scoring mappings)

import type { SpecScores, Answers } from '@snowboard/types'

export type Option = {
  id: string
  text: string
  weights: Partial<SpecScores>
}

type BaseQuestion = {
  id: string
  phase: 1 | 2 | 3 | 4
  text: string
  showIf?: string  // validated at runtime against keys of rules.ts
}

export type OptionQuestion = BaseQuestion & {
  inputType?: 'single' | 'multi'
  options: Option[]
}

export type NumericQuestion = BaseQuestion & {
  inputType: 'numeric'
  answersKey: keyof Answers
  min?: number
  max?: number
  unit?: string
}

export type Question = OptionQuestion | NumericQuestion

export type QuestionInputType = 'single' | 'multi' | 'numeric'

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
