import type { MDXComponents } from 'mdx/types'
import { ReactMdxComponent } from './components/blog/react-mdx-component'

export const customComponents = {
  ReactMdxComponent,
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...customComponents,
  }
}
