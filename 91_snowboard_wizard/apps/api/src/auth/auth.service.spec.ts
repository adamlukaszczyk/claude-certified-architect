import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'

const mockUser = { id: 'user-1', googleId: 'g-1', email: 'test@test.com', name: 'Test', avatarUrl: null, createdAt: new Date() }
const mockUsersService = { upsertFromGoogle: jest.fn().mockResolvedValue(mockUser) }
const mockJwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') }
const mockConfigService = { get: jest.fn().mockReturnValue('google-client-id') }

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
      ],
    }).compile()
    const svc = moduleNew.get(AuthService)
    await expect(svc.loginWithGoogle('bad-token')).rejects.toThrow('Invalid Google ID token')
  })
})
