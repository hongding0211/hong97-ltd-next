import createMDX from '@next/mdx'
import rehypeStarryNight from 'rehype-starry-night'
import { devNextConfig } from './next.config.dev.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['cn', 'en'],
    reloadOnPrerender: true,
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  ...(
    process.env.NODE_ENV === 'development' ? devNextConfig : {}
  )
}

const withMDX = createMDX({
  options: {
    rehypePlugins: [rehypeStarryNight],
  },
})

export default withMDX(nextConfig)
