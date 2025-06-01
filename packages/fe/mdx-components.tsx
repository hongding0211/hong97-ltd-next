import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    code: (props) => {
      return (
        <span className="bg-neutral-100 dark:bg-neutral-800 text-sm font-medium rounded-md p-1">
          {props.children}
        </span>
      )
    },
  }
}
