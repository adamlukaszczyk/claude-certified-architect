/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ['@snowboard/ui'],
  experimental: {
    typedRoutes: true,
    serverComponentsExternalPackages: ['@snowboard/wizard-schema'],
  },
}

export default config
