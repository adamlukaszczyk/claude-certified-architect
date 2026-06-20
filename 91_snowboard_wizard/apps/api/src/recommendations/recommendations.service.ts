// recommendations.service.ts - Creates and retrieves recommendations
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, DeepPartial, Repository } from 'typeorm'
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
    private readonly dataSource: DataSource,
  ) {}

  async create(
    answers: Answers,
    userId: string | null,
    sessionName: string | null,
  ): Promise<RecommendationResult> {
    const { scores, specSheet } = this.scoringService.score(answers)
    const claudeNarrative = await this.narrativeService.generate(answers, specSheet)

    const shareToken = randomBytes(32).toString('base64url')

    return await this.dataSource.transaction(async (manager) => {
      const sessionData: DeepPartial<WizardSessionEntity> = {
        userId,
        name: sessionName ?? null,
        answers,
        scores,
        schemaVersion: 1,
        phaseReached: 4,
        completedAt: new Date(),
      }
      const savedSession = await manager.save(WizardSessionEntity, sessionData)

      const recData: DeepPartial<RecommendationEntity> = {
        sessionId: savedSession.id,
        specSheet,
        claudeNarrative,
        shareToken,
      }
      const savedRec = await manager.save(RecommendationEntity, recData)

      return {
        id: savedRec.id,
        shareToken: savedRec.shareToken,
        specSheet,
        claudeNarrative,
        sessionId: savedSession.id,
        createdAt: savedRec.createdAt,
      }
    })
  }

  async findById(id: string): Promise<RecommendationEntity | null> {
    return this.recRepo.findOne({ where: { id }, relations: ['session'] })
  }

  async findByShareToken(shareToken: string): Promise<RecommendationEntity | null> {
    return this.recRepo.findOne({ where: { shareToken }, relations: ['session'] })
  }
}
