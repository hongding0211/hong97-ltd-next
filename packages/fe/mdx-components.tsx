import type { MDXComponents } from 'mdx/types'
import { BlogLink } from './components/blog/BlogLink'
import { MarkdownImage } from './components/blog/MarkdownImage'
import { BlogCodeBlock } from './components/blog/blog-code-block'
import { ReactMdxComponent } from './components/blog/react-mdx-component'

export const customComponents = {
  a: BlogLink,
  img: MarkdownImage,
  MarkdownImage,
  pre: BlogCodeBlock,
  ReactMdxComponent,
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...customComponents,
  }
}
