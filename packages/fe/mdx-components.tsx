import type { MDXComponents } from 'mdx/types'

export const customComponents = {}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...customComponents,
  }
}
