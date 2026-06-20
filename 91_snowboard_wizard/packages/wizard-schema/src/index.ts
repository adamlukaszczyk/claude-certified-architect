// index.ts - Public API for @snowboard/wizard-schema
import path from 'path'

export const SCHEMA_ROOT = path.resolve(__dirname, '..')
export { rules } from './rules'
export type { RuleName } from './rules'
export { loadQuestions, loadScoringTables } from './loader'
export type { Question, OptionQuestion, NumericQuestion, Option, ScoreMapping, ScoringTable, QuestionInputType } from './types'
