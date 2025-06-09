const { i18n } = require('./next-i18next.config')
const createMDX = require('@next/mdx')

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3500/:path*',
      },
    ]
  },
}

const withMDX = createMDX({})

module.exports = withMDX(nextConfig) 