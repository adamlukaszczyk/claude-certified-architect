// index.ts - Shared domain interfaces for @snowboard/types

export type SpecScores = {
  length: number    // raw score → board length in cm
  width: number     // raw score → waist width category
  flex: number      // raw score → 1–10 flex rating
  shape: number     // raw score → directional / twin / directional-twin / tapered
  camber: number    // raw score → camber / rocker / hybrid / flat
  taper: number     // raw score → mm taper ratio
  sidecut: number   // raw score → short / medium / long radius
  setback: number   // raw score → centered / slight / aggressive
  base: number      // raw score → sintered / extruded
  float: number     // raw score → powder float priority
}

export type RidingStyle =
  | 'freestyle'
  | 'all-mountain'
  | 'freeride'
  | 'carving'
  | 'powder'
  | 'splitboard'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type FootStance = 'regular' | 'goofy'

export type SnowCondition = 'hardpack' | 'powder' | 'mixed' | 'ice'

export type Answers = {
  // Phase 1
  heightCategory?: string
  weightCategory?: string
  bootSize?: string
  experience?: ExperienceLevel
  stance?: FootStance
  ridingDays?: number
  // Phase 2
  style?: RidingStyle
  terrain?: {
    park: number
    groomed: number
    backcountry: number
    trees: number
  }
  snowCondition?: SnowCondition
  // Phase 3 — freestyle
  parkFeatureFocus?: string
  switchFrequency?: string
  preferredTricks?: string
  // Phase 3 — powder/freeride
  backcountryVsResort?: string
  touringNeeds?: string
  taperPreference?: string
  // Phase 3 — carving
  turnRadius?: string
  edgeAggression?: string
  // Phase 3 — all-mountain
  groomedOffPisteSplit?: string
  speedPreference?: string
  // Phase 4
  camberOverride?: string
  flexFeel?: string
  torsionalRigidity?: string
  baseMaintenance?: string
  stanceSetback?: string
  budgetRange?: string
}

export type PartialScores = Partial<SpecScores>

export type User = {
  id: string
  googleId: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: Date
}

export type WizardSession = {
  id: string
  userId: string | null
  name: string | null
  answers: Answers
  scores: PartialScores | null
  schemaVersion: number
  phaseReached: number
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type SpecSheet = {
  lengthCm: number
  waistWidthMm: number
  flexRating: number
  flexLabel: string
  shape: string
  camberProfile: string
  taperMm: number
  sidecutRadius: string
  setback: string
  baseType: string
  floatPriority: string
}

export type Recommendation = {
  id: string
  sessionId: string
  specSheet: SpecSheet
  claudeNarrative: string | null
  shareToken: string
  createdAt: Date
}
