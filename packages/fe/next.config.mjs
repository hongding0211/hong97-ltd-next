import createMDX from '@next/mdx'
import rehypeHighlight from 'rehype-highlight'
import { devNextConfig } from './next.config.dev.mjs'
import remarkImages from './utils/remark-images.cjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['cn', 'en'],
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  async rewrites() {
    const devRewrites = process.env.NODE_ENV === 'development' ? await devNextConfig.rewrites() : []
    return [
      {
        source: '/.well-known/apple-app-site-association',
        destination: '/apple-app-site-association.json',
      },
      ...devRewrites,
    ]
  },
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkImages],
    rehypePlugins: [rehypeHighlight],
  },
})

export default withMDX(nextConfig)
