// scoring.service.ts - Stage 1 deterministic scoring engine
import { Injectable } from '@nestjs/common'
import { loadQuestions, loadScoringTables, SCHEMA_ROOT } from '@snowboard/wizard-schema'
import type { Question, OptionQuestion, ScoringTable } from '@snowboard/wizard-schema'
import type { Answers, PartialScores, SpecScores, SpecSheet } from '@snowboard/types'

// Maps snake_case question ID → camelCase Answers key
// This is the one permitted `as` cast per global constraints
function toAnswersKey(questionId: string): keyof Answers {
  return questionId.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()) as keyof Answers
}

function lookupMapping(
  tables: ScoringTable[],
  dimension: keyof SpecScores,
  raw: number,
): { value: number | string; label: string } {
  const table = tables.find(t => t.dimension === dimension)
  if (!table) throw new Error(`No scoring table for dimension: ${dimension}`)
  const mapping =
    table.mappings.find(m => raw >= m.scoreRange[0] && raw <= m.scoreRange[1]) ??
    table.mappings[0]
  return { value: mapping.value, label: mapping.label }
}

@Injectable()
export class ScoringService {
  private readonly questions: Question[]
  private readonly tables: ScoringTable[]

  constructor() {
    this.questions = loadQuestions(SCHEMA_ROOT)
    this.tables = loadScoringTables(SCHEMA_ROOT)
  }

  partialScore(answers: Answers): PartialScores {
    return this.accumulate(answers)
  }

  score(answers: Answers): { scores: SpecScores; specSheet: SpecSheet } {
    const partial = this.accumulate(answers)
    const scores = partial as SpecScores
    const specSheet = this.buildSpecSheet(scores)
    return { scores, specSheet }
  }

  private accumulate(answers: Answers): PartialScores {
    const raw: Record<string, number> = {
      length: 0,
      width: 0,
      flex: 0,
      shape: 0,
      camber: 0,
      taper: 0,
      sidecut: 0,
      setback: 0,
      base: 0,
      float: 0,
    }

    for (const q of this.questions) {
      if (q.inputType === 'numeric') continue
      const answerKey = toAnswersKey(q.id)
      const selectedId = answers[answerKey] as string | undefined
      if (!selectedId) continue
      const optionQuestion = q as OptionQuestion
      const option = optionQuestion.options.find(o => o.id === selectedId)
      if (!option) continue
      for (const [dim, weight] of Object.entries(option.weights)) {
        raw[dim] = (raw[dim] ?? 0) + (weight as number)
      }
    }

    return raw as PartialScores
  }

  private buildSpecSheet(scores: SpecScores): SpecSheet {
    const flex = lookupMapping(this.tables, 'flex', scores.flex)
    const length = lookupMapping(this.tables, 'length', scores.length)
    const width = lookupMapping(this.tables, 'width', scores.width)
    const shape = lookupMapping(this.tables, 'shape', scores.shape)
    const camber = lookupMapping(this.tables, 'camber', scores.camber)
    const taper = lookupMapping(this.tables, 'taper', scores.taper)
    const sidecut = lookupMapping(this.tables, 'sidecut', scores.sidecut)
    const setback = lookupMapping(this.tables, 'setback', scores.setback)
    const base = lookupMapping(this.tables, 'base', scores.base)
    const float = lookupMapping(this.tables, 'float', scores.float)

    return {
      lengthCm: length.value as number,
      waistWidthMm: width.value as number,
      flexRating: flex.value as number,
      flexLabel: flex.label,
      shape: shape.value as string,
      camberProfile: camber.value as string,
      taperMm: taper.value as number,
      sidecutRadius: sidecut.value as string,
      setback: setback.value as string,
      baseType: base.value as string,
      floatPriority: float.value as string,
    }
  }
}
