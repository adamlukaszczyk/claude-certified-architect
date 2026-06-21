// sessions-claim.service.ts - Links guest wizard sessions to a newly authenticated user
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import { WizardSessionEntity } from '../entities/wizard-session.entity'

@Injectable()
export class SessionsClaimService {
  constructor(
    @InjectRepository(WizardSessionEntity)
    private readonly sessionRepo: Repository<WizardSessionEntity>,
  ) {}

  async claimGuestSessions(guestSessionId: string, userId: string): Promise<void> {
    const guestSessions = await this.sessionRepo.find({
      where: { id: guestSessionId, userId: IsNull() },
    })

    for (const session of guestSessions) {
      const oldId = session.id
      // Delete old guest session (rotates the session identifier — prevents session fixation)
      await this.sessionRepo.delete(oldId)
      // Re-insert with new auto-generated UUID and the authenticated userId
      const newSession: Partial<WizardSessionEntity> = {
        userId,
        name: session.name,
        answers: session.answers,
        scores: session.scores,
        schemaVersion: session.schemaVersion,
        phaseReached: session.phaseReached,
        completedAt: session.completedAt,
      }
      await this.sessionRepo.save(newSession)
    }
  }
}
