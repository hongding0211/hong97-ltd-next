import type { MDXComponents } from 'mdx/types'
import { BlogLink } from './components/blog/BlogLink'
import { ReactMdxComponent } from './components/blog/react-mdx-component'

export const customComponents = {
  a: BlogLink,
  ReactMdxComponent,
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...customComponents,
  }
}
