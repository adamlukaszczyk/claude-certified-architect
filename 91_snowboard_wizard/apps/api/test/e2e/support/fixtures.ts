// fixtures.ts - Canned answer sets for common rider archetypes
// Used in step definitions to avoid repeating large JSON bodies

export interface RiderFixture {
  label: string
  answers: Record<string, unknown>
}

export const FIXTURES: Record<string, RiderFixture> = {
  allMountainIntermediate: {
    label: 'Intermediate all-mountain rider',
    answers: {
      experience: 'intermediate',
      style: 'all-mountain',
      weightCategory: 'w_71_85',
      stance: 'regular',
      terrainMix: 'mixed',
      snowConditions: 'mixed',
    },
  },
  powderExpert: {
    label: 'Expert powder / freeride rider',
    answers: {
      experience: 'expert',
      style: 'powder',
      weightCategory: 'over_100',
      stance: 'regular',
      terrainMix: 'mostly_backcountry',
      snowConditions: 'powder',
      taperPreference: 'high_taper',
    },
  },
  freestyleBeginner: {
    label: 'Beginner freestyle rider',
    answers: {
      experience: 'beginner',
      style: 'freestyle',
      weightCategory: 'w_56_70',
      stance: 'goofy',
      terrainMix: 'park',
      snowConditions: 'mixed',
    },
  },
  carvingAdvanced: {
    label: 'Advanced carving rider',
    answers: {
      experience: 'advanced',
      style: 'carving',
      weightCategory: 'w_86_100',
      stance: 'regular',
      terrainMix: 'groomed',
      snowConditions: 'hardpack',
      turnRadius: 'long_arc',
    },
  },
}
