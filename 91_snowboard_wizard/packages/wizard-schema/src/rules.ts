// rules.ts - Branching condition functions for the wizard
// Every showIf value in YAML must be a key exported from this object.

import type { Answers, PartialScores } from '@snowboard/types'

export const rules: Record<string, (a: Answers, s?: PartialScores) => boolean> = {
  isFreestyle: (a) =>
    a.style === 'freestyle',

  isPowderFocused: (a) =>
    a.style === 'powder' || a.style === 'freeride',

  isCarving: (a) =>
    a.style === 'carving',

  isAllMountain: (a) =>
    a.style === 'all-mountain',

  splitboardCandidate: (a) =>
    a.style === 'freeride' &&
    (a.terrain?.backcountry ?? 0) > 60 &&
    (a.ridingDays ?? 0) > 15,

  needsTaperQuestion: (a, s) =>
    (a.style === 'powder' || a.style === 'freeride') &&
    a.experience !== 'beginner' &&
    (s?.flex ?? 0) >= 5,
}
