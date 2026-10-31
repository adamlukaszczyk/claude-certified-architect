import path from 'path'
import { loadQuestions, loadScoringTables } from '../loader'

const SCHEMA_ROOT = path.resolve(__dirname, '../../')

describe('loadQuestions', () => {
  it('loads all questions without throwing', () => {
    const questions = loadQuestions(SCHEMA_ROOT)
    expect(questions.length).toBeGreaterThan(20)
  })

  it('all questions have required fields', () => {
    const questions = loadQuestions(SCHEMA_ROOT)
    for (const q of questions) {
      expect(typeof q.id).toBe('string')
      expect([1, 2, 3, 4]).toContain(q.phase)
      expect(typeof q.text).toBe('string')
    }
  })

  it('rejects a question with an unknown showIf rule', () => {
    expect(() =>
      loadQuestions(SCHEMA_ROOT, [
        {
          id: 'bad_question',
          phase: 3,
          text: 'Test?',
          showIf: 'nonExistentRule',
          options: [{ id: 'opt', text: 'Option', weights: {} }],
        },
      ])
    ).toThrow(/nonExistentRule/)
  })

  it('all showIf values in real YAML exist in rules.ts', () => {
    expect(() => loadQuestions(SCHEMA_ROOT)).not.toThrow()
  })
})

describe('loadScoringTables', () => {
  it('loads all 10 scoring dimension tables', () => {
    const tables = loadScoringTables(SCHEMA_ROOT)
    expect(tables.length).toBe(10)
  })

  it('every table has a valid dimension name', () => {
    const tables = loadScoringTables(SCHEMA_ROOT)
    const validDimensions = ['length', 'width', 'flex', 'shape', 'camber', 'taper', 'sidecut', 'setback', 'base', 'float']
    for (const table of tables) {
      expect(validDimensions).toContain(table.dimension)
    }
  })

  it('score ranges are non-overlapping and sorted within each table', () => {
    const tables = loadScoringTables(SCHEMA_ROOT)
    for (const table of tables) {
      for (let i = 1; i < table.mappings.length; i++) {
        const prev = table.mappings[i - 1]
        const curr = table.mappings[i]
        expect(curr.scoreRange[0]).toBeGreaterThan(prev.scoreRange[1])
      }
    }
  })
})
