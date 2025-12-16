import createMDX from '@next/mdx'
import rehypeStarryNight from 'rehype-starry-night'

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    defaultLocale: 'en',
    locales: ['cn', 'en'],
    reloadOnPrerender: true,
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
}

const withMDX = createMDX({
  options: {
    rehypePlugins: [rehypeStarryNight],
  },
})

export default withMDX(nextConfig)
