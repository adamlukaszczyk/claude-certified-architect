// recommendations.service.ts - Creates and retrieves recommendations
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomBytes } from 'crypto'
import { RecommendationEntity } from '../entities/recommendation.entity'
import { WizardSessionEntity } from '../entities/wizard-session.entity'
import { ScoringService } from '../scoring/scoring.service'
import { NarrativeService } from '../narrative/narrative.service'
import type { Answers, SpecSheet } from '@snowboard/types'

type RecommendationResult = {
  id: string
  shareToken: string
  specSheet: SpecSheet
  claudeNarrative: string | null
  sessionId: string
  createdAt: Date
}

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(RecommendationEntity)
    private readonly recRepo: Repository<RecommendationEntity>,
    @InjectRepository(WizardSessionEntity)
    private readonly sessionRepo: Repository<WizardSessionEntity>,
    private readonly scoringService: ScoringService,
    private readonly narrativeService: NarrativeService,
  ) {}

  async create(
    answers: Answers,
    userId: string | null,
    sessionName: string | null,
  ): Promise<RecommendationResult> {
    const { scores, specSheet } = this.scoringService.score(answers)
    const claudeNarrative = await this.narrativeService.generate(answers, specSheet)

    const session = await this.sessionRepo.save({
      userId,
      name: sessionName ?? null,
      answers,
      scores,
      schemaVersion: 1,
      phaseReached: 4,
      completedAt: new Date(),
    } as Partial<WizardSessionEntity>)

    const shareToken = randomBytes(32).toString('base64url')
    const rec = await this.recRepo.save({
      sessionId: session.id,
      specSheet,
      claudeNarrative,
      shareToken,
    } as Partial<RecommendationEntity>)

    return {
      id: rec.id,
      shareToken: rec.shareToken,
      specSheet,
      claudeNarrative,
      sessionId: session.id,
      createdAt: rec.createdAt,
    }
  }

  async findById(id: string): Promise<RecommendationEntity | null> {
    return this.recRepo.findOne({ where: { id }, relations: ['session'] })
  }

  async findByShareToken(shareToken: string): Promise<RecommendationEntity | null> {
    return this.recRepo.findOne({ where: { shareToken }, relations: ['session'] })
  }
}
