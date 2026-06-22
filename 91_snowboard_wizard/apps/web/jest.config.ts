import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.jest.json', useESM: false }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@snowboard/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@snowboard/ui$': '<rootDir>/../../packages/ui/src/index.ts',
    '^@snowboard/wizard-schema$': '<rootDir>/../../packages/wizard-schema/src/index.ts',
    '^@snowboard/wizard-schema/rules$': '<rootDir>/../../packages/wizard-schema/src/rules.ts',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
}

export default config
