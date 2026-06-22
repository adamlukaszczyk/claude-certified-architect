import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@snowboard/ui'],
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['@snowboard/wizard-schema'],
  },
}

export default config
