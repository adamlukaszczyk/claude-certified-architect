import path from 'path'
import { loadQuestions, loadScoringTables, rules } from '../index'
import type { Answers, PartialScores } from '@snowboard/types'

const SCHEMA_ROOT = path.resolve(__dirname, '../../')

describe('full schema integration', () => {
  let allQuestions: ReturnType<typeof loadQuestions>
  let scoringTables: ReturnType<typeof loadScoringTables>

  beforeAll(() => {
    allQuestions = loadQuestions(SCHEMA_ROOT)
    scoringTables = loadScoringTables(SCHEMA_ROOT)
  })

  it('loads more than 20 questions across 4 phases', () => {
    expect(allQuestions.length).toBeGreaterThan(20)
    const phases = new Set(allQuestions.map((q) => q.phase))
    expect(phases).toContain(1)
    expect(phases).toContain(2)
    expect(phases).toContain(3)
    expect(phases).toContain(4)
  })

  it('loads exactly 10 scoring tables (one per SpecScores dimension)', () => {
    expect(scoringTables.length).toBe(10)
  })

  it('a powder rider answers Phase 1–3 and the correct questions are shown', () => {
    const answers: Answers = {
      experience: 'advanced',
      style: 'powder',
      ridingDays: 30,
      terrain: { park: 0, groomed: 10, backcountry: 70, trees: 20 },
    }
    const partialScores: PartialScores = { flex: 6 }

    const visibleQuestions = allQuestions.filter((q) => {
      if (!q.showIf) return true
      return rules[q.showIf]?.(answers, partialScores) ?? false
    })

    const visibleIds = visibleQuestions.map((q) => q.id)
    expect(visibleIds).toContain('taper_preference')
    expect(visibleIds).toContain('backcountry_vs_resort')
    expect(visibleIds).not.toContain('park_feature_focus')
    expect(visibleIds).not.toContain('turn_radius')
  })

  it('a freestyle beginner does not see taper or backcountry questions', () => {
    const answers: Answers = {
      experience: 'beginner',
      style: 'freestyle',
      ridingDays: 5,
      terrain: { park: 80, groomed: 20, backcountry: 0, trees: 0 },
    }
    const partialScores: PartialScores = { flex: -2 }

    const visibleIds = allQuestions
      .filter((q) => {
        if (!q.showIf) return true
        return rules[q.showIf]?.(answers, partialScores) ?? false
      })
      .map((q) => q.id)

    expect(visibleIds).toContain('park_feature_focus')
    expect(visibleIds).not.toContain('taper_preference')
    expect(visibleIds).not.toContain('backcountry_vs_resort')
    expect(visibleIds).not.toContain('turn_radius')
  })

  it('flex score of 6 maps to Medium-Stiff label', () => {
    const flexTable = scoringTables.find((t) => t.dimension === 'flex')!
    const match = flexTable.mappings.find(
      (m) => 6 >= m.scoreRange[0] && 6 <= m.scoreRange[1]
    )
    expect(match?.label).toBe('Medium-Stiff')
  })

  it('taper score of 5 maps to High Taper', () => {
    const taperTable = scoringTables.find((t) => t.dimension === 'taper')!
    const match = taperTable.mappings.find(
      (m) => 5 >= m.scoreRange[0] && 5 <= m.scoreRange[1]
    )
    expect(match?.label).toBe('High Taper (25 mm)')
  })
})
