import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@snowboard/ui'],
  serverExternalPackages: ['@snowboard/wizard-schema'],
  experimental: {
    typedRoutes: true,
  },
}

export default config
