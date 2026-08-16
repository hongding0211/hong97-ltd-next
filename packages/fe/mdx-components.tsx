import type { MDXComponents } from 'mdx/types'
import { BlogLink } from './components/blog/BlogLink'
import { BlogCodeBlock } from './components/blog/blog-code-block'
import { ReactMdxComponent } from './components/blog/react-mdx-component'

export const customComponents = {
  a: BlogLink,
  pre: BlogCodeBlock,
  ReactMdxComponent,
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...customComponents,
  }
}
