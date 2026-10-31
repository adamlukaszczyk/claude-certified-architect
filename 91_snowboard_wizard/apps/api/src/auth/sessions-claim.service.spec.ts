import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SessionsClaimService } from './sessions-claim.service'
import { WizardSessionEntity } from '../entities/wizard-session.entity'

const guestSession = { id: 'gs-1', userId: null, answers: {} }
const mockSessionRepo = {
  find: jest.fn().mockResolvedValue([guestSession]),
  save: jest.fn().mockImplementation((e: Partial<WizardSessionEntity>) => e),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  create: jest.fn().mockImplementation((e: Partial<WizardSessionEntity>) => e),
}

describe('SessionsClaimService', () => {
  let service: SessionsClaimService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsClaimService,
        { provide: getRepositoryToken(WizardSessionEntity), useValue: mockSessionRepo },
      ],
    }).compile()
    service = module.get(SessionsClaimService)
    jest.clearAllMocks()
    mockSessionRepo.find.mockResolvedValue([guestSession])
  })

  it('claimGuestSessions() links null userId sessions to the logged-in user', async () => {
    await service.claimGuestSessions('gs-1', 'user-1')
    // The service should delete the old session and recreate with new id (session fixation prevention)
    expect(mockSessionRepo.delete).toHaveBeenCalledWith('gs-1')
    expect(mockSessionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' })
    )
  })

  it('claimGuestSessions() with no guest sessions does nothing', async () => {
    mockSessionRepo.find.mockResolvedValue([])
    await service.claimGuestSessions('unknown', 'user-1')
    expect(mockSessionRepo.delete).not.toHaveBeenCalled()
  })
})
