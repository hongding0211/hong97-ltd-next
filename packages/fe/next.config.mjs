import createMDX from '@next/mdx'
import rehypeHighlight from 'rehype-highlight'
import { devNextConfig } from './next.config.dev.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['cn', 'en'],
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  ...(
    process.env.NODE_ENV === 'development' ? devNextConfig : {}
  )
}

const withMDX = createMDX({
  options: {
    rehypePlugins: [rehypeHighlight],
  },
})

export default withMDX(nextConfig)
