// loader.ts - YAML loader with Zod validation for wizard questions and scoring tables

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { z } from 'zod'
import { rules } from './rules'
import type { Question, ScoringTable } from './types'

const SPEC_DIMENSIONS = ['length', 'width', 'flex', 'shape', 'camber', 'taper', 'sidecut', 'setback', 'base', 'float'] as const

const BaseQuestionFields = {
  id: z.string(),
  phase: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
  showIf: z.string().optional(),
}

const OptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  weights: z.record(z.enum(SPEC_DIMENSIONS), z.number()).default({}),
})

const OptionQuestionSchema = z.object({
  ...BaseQuestionFields,
  inputType: z.enum(['single', 'multi']).optional(),
  options: z.array(OptionSchema).min(1),
})

const NumericQuestionSchema = z.object({
  ...BaseQuestionFields,
  inputType: z.literal('numeric'),
  answersKey: z.string(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
})

const QuestionSchema = z.union([NumericQuestionSchema, OptionQuestionSchema])

const ScoreMappingSchema = z.object({
  scoreRange: z.tuple([z.number(), z.number()]),
  value: z.union([z.number(), z.string()]),
  label: z.string(),
  description: z.string(),
})

const ScoringTableSchema = z.object({
  dimension: z.enum(SPEC_DIMENSIONS),
  mappings: z.array(ScoreMappingSchema),
})

function loadYamlFile<T>(filePath: string, schema: z.ZodType<T>): T {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = yaml.load(raw)
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Invalid YAML schema in ${filePath}:\n${result.error.toString()}`
    )
  }
  return result.data
}

function validateShowIfKeys(questions: Question[]): void {
  const ruleKeys = new Set(Object.keys(rules))
  const missing: string[] = []
  for (const q of questions) {
    if (q.showIf && !ruleKeys.has(q.showIf)) {
      missing.push(`Question "${q.id}" references unknown rule "${q.showIf}"`)
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `wizard-schema validation failed — missing rule functions in rules.ts:\n${missing.join('\n')}`
    )
  }
}

export function loadQuestions(
  schemaRoot: string,
  extraQuestions: unknown[] = []
): Question[] {
  const questionsDir = path.join(schemaRoot, 'questions')
  const files = fs
    .readdirSync(questionsDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()

  const allRaw: unknown[] = []
  for (const file of files) {
    const parsed = yaml.load(
      fs.readFileSync(path.join(questionsDir, file), 'utf-8')
    )
    if (!Array.isArray(parsed)) {
      throw new Error(`questions/${file} must be a YAML array, got ${typeof parsed}`)
    }
    allRaw.push(...parsed)
  }
  allRaw.push(...extraQuestions)

  const questions: Question[] = allRaw.map((raw, i) => {
    const result = QuestionSchema.safeParse(raw)
    if (!result.success) {
      const id = (raw as Record<string, unknown>)?.id ?? `index ${i}`
      throw new Error(`Question "${id}" is invalid:\n${result.error.toString()}`)
    }
    return result.data as Question
  })

  validateShowIfKeys(questions)
  return questions
}

export function loadScoringTables(schemaRoot: string): ScoringTable[] {
  const scoringDir = path.join(schemaRoot, 'scoring')
  const files = fs
    .readdirSync(scoringDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()

  return files.map((file) => {
    const filePath = path.join(scoringDir, file)
    return loadYamlFile(filePath, ScoringTableSchema) as ScoringTable
  })
}
