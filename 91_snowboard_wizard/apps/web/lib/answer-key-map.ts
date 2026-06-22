// answer-key-map.ts - Maps snake_case question IDs to camelCase Answers keys
import type { Answers } from '@snowboard/types'

export const ANSWER_KEY_MAP: Record<string, keyof Answers> = {
  height_category: 'heightCategory',
  weight_category: 'weightCategory',
  boot_size: 'bootSize',
  experience: 'experience',
  stance: 'stance',
  riding_days: 'ridingDays',
  style: 'style',
  terrain_mix: 'terrainMix',
  snow_condition: 'snowCondition',
  park_feature_focus: 'parkFeatureFocus',
  switch_frequency: 'switchFrequency',
  preferred_tricks: 'preferredTricks',
  backcountry_vs_resort: 'backcountryVsResort',
  touring_needs: 'touringNeeds',
  taper_preference: 'taperPreference',
  turn_radius: 'turnRadius',
  edge_aggression: 'edgeAggression',
  groomed_off_piste_split: 'groomedOffPisteSplit',
  speed_preference: 'speedPreference',
  camber_override: 'camberOverride',
  flex_feel: 'flexFeel',
  torsional_rigidity: 'torsionalRigidity',
  base_maintenance: 'baseMaintenance',
  stance_setback: 'stanceSetback',
  budget_range: 'budgetRange',
}

export function toAnswerKey(questionId: string): keyof Answers {
  return ANSWER_KEY_MAP[questionId] ?? (questionId as keyof Answers)
}
