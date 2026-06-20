// narrative.service.ts - Stage 2: Claude narrative overlay on top of deterministic spec
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import type { Answers, SpecSheet } from '@snowboard/types'

const NARRATIVE_PROMPT = `You are a professional snowboard fitter with 20 years of experience.
A rider has completed a selection wizard. Based on their profile and derived spec sheet, write a personalized recommendation.

Rider profile:
- Experience: {experience}
- Riding style: {style}
- Riding days per season: {ridingDays}
- Terrain preference: {terrainMix}

Derived specification:
- Board length: {lengthCm} cm
- Waist width: {waistWidthMm} mm
- Flex rating: {flexRating}/10 ({flexLabel})
- Shape: {shape}
- Camber profile: {camberProfile}
- Taper: {taperMm} mm
- Sidecut radius: {sidecutRadius}
- Stance setback: {setback}
- Base type: {baseType}
- Powder float priority: {floatPriority}

Write exactly four sections separated by blank lines:
1. A 2–3 sentence personalized explanation of why these specs suit this rider.
2. One sentence about the main trade-off (what they sacrifice for this build).
3. One sentence suggesting an alternative to consider if their priorities shift.
4. Any contradiction flags (e.g., beginner requesting expert terrain, or freestyle rider with carving-optimized flex). If none, write "No contradictions detected."

Write in second person ("Your board..."). Be specific — reference the actual spec values. No markdown headers or bullet points.`

@Injectable()
export class NarrativeService {
  private readonly client: Anthropic | null

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('anthropic.apiKey') ?? ''
    this.client = apiKey ? new Anthropic({ apiKey }) : null
  }

  async generate(answers: Answers, specSheet: SpecSheet): Promise<string> {
    if (!this.client) {
      return `Spec sheet generated: ${specSheet.flexLabel} flex, ${specSheet.lengthCm} cm ${specSheet.shape} with ${specSheet.camberProfile} profile.`
    }

    const prompt = NARRATIVE_PROMPT
      .replace('{experience}', answers.experience ?? 'not specified')
      .replace('{style}', answers.style ?? 'not specified')
      .replace('{ridingDays}', String(answers.ridingDays ?? 'not specified'))
      .replace('{terrainMix}', answers.terrainMix ?? 'not specified')
      .replace('{lengthCm}', String(specSheet.lengthCm))
      .replace('{waistWidthMm}', String(specSheet.waistWidthMm))
      .replace('{flexRating}', String(specSheet.flexRating))
      .replace('{flexLabel}', specSheet.flexLabel)
      .replace('{shape}', specSheet.shape)
      .replace('{camberProfile}', specSheet.camberProfile)
      .replace('{taperMm}', String(specSheet.taperMm))
      .replace('{sidecutRadius}', specSheet.sidecutRadius)
      .replace('{setback}', specSheet.setback)
      .replace('{baseType}', specSheet.baseType)
      .replace('{floatPriority}', specSheet.floatPriority)

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    return textBlock?.type === 'text' ? textBlock.text : ''
  }
}
