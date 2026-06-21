import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { createHash } from 'crypto'
import { AuthService } from './auth.service'
import { SessionsClaimService } from './sessions-claim.service'
import { UsersService } from '../users/users.service'
import { RefreshTokenEntity } from '../entities/refresh-token.entity'

const mockUser = { id: 'user-1', googleId: 'g-1', email: 'test@test.com', name: 'Test', avatarUrl: null, createdAt: new Date() }
const mockUsersService = { upsertFromGoogle: jest.fn().mockResolvedValue(mockUser) }
const mockJwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') }
const mockConfigService = { get: jest.fn().mockReturnValue('google-client-id') }
const mockRefreshTokenRepo = { save: jest.fn().mockResolvedValue({}) }
const mockSessionsClaimService = { claimGuestSessions: jest.fn().mockResolvedValue(undefined) }

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({
        sub: 'g-1',
        email: 'test@test.com',
        name: 'Test',
        picture: null,
      }),
    }),
  })),
}))

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepo },
        { provide: SessionsClaimService, useValue: mockSessionsClaimService },
      ],
    }).compile()
    service = module.get(AuthService)
  })

  it('loginWithGoogle() verifies token and returns access JWT', async () => {
    const result = await service.loginWithGoogle('valid-google-id-token')
    expect(result.accessToken).toBe('mock-jwt-token')
    expect(result.user.email).toBe('test@test.com')
    expect(mockUsersService.upsertFromGoogle).toHaveBeenCalledWith('g-1', 'test@test.com', 'Test', null)
  })

  it('loginWithGoogle() with invalid token throws UnauthorizedException', async () => {
    const { OAuth2Client } = jest.requireMock('google-auth-library')
    OAuth2Client.mockImplementationOnce(() => ({
      verifyIdToken: jest.fn().mockRejectedValue(new Error('invalid token')),
    }))
    const moduleNew = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRefreshTokenRepo },
        { provide: SessionsClaimService, useValue: mockSessionsClaimService },
      ],
    }).compile()
    const svc = moduleNew.get(AuthService)
    await expect(svc.loginWithGoogle('bad-token')).rejects.toThrow('Invalid Google ID token')
  })

  describe('issueRefreshToken', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-06-20T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('stores a SHA-256 hash and returns the raw token', async () => {
      mockRefreshTokenRepo.save.mockResolvedValue({})
      const beforeCall = Date.now()
      const raw = await service.issueRefreshToken('user-123')
      const afterCall = Date.now()
      expect(raw).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(raw.length).toBeGreaterThan(30)
      const saveArg = mockRefreshTokenRepo.save.mock.calls[0][0]
      const expectedHash = createHash('sha256').update(raw).digest('hex')
      expect(saveArg.tokenHash).toBe(expectedHash)
      expect(saveArg.tokenHash).toHaveLength(64)
      expect(saveArg.tokenHash).not.toBe(raw)
      expect(saveArg.userId).toBe('user-123')
      expect(saveArg.expiresAt).toBeInstanceOf(Date)
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      const expectedMinMs = beforeCall + thirtyDaysMs
      const expectedMaxMs = afterCall + thirtyDaysMs
      expect(saveArg.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinMs)
      expect(saveArg.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxMs)
    })
  })
})
