// narrative.service.ts - Stage 2: Claude narrative + Redis rate limiting
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { RedisService } from '../cache/redis.service'
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

const RATE_LIMIT_CALLS = 10
const RATE_LIMIT_WINDOW = 60 // seconds

@Injectable()
export class NarrativeService {
  private readonly logger = new Logger(NarrativeService.name)
  private readonly client: Anthropic | null

  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const apiKey = config.get<string>('anthropic.apiKey') ?? ''
    this.client = apiKey ? new Anthropic({ apiKey }) : null
  }

  async generate(answers: Answers, specSheet: SpecSheet, userId?: string): Promise<string> {
    const fallback = `Spec sheet generated: ${specSheet.flexLabel} flex, ${specSheet.lengthCm} cm ${specSheet.shape} with ${specSheet.camberProfile} profile.`

    if (!this.client) return fallback

    if (userId) {
      const rateKey = `rate:claude:${userId}`
      const count = await this.redis.incr(rateKey)
      if (count === 1) await this.redis.expire(rateKey, RATE_LIMIT_WINDOW)
      if (count > RATE_LIMIT_CALLS) return fallback
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

    const requestBody = { model: 'claude-sonnet-4-6', max_tokens: 600, messages: [{ role: 'user' as const, content: prompt }] }
    this.logger.debug(`Anthropic request body: ${JSON.stringify(requestBody)}`)

    try {
      const response = await this.client.messages.create(requestBody)
      this.logger.debug(`Anthropic response: ${JSON.stringify(response)}`)
      const textBlock = response.content.find(b => b.type === 'text')
      return textBlock?.type === 'text' ? textBlock.text : fallback
    } catch (err) {
      this.logger.error(`Anthropic API call failed, using fallback. Error: ${err}`)
      return fallback
    }
  }
}
