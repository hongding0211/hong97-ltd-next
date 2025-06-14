import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    code: (props) => {
      if (typeof props.children === 'string') {
        return (
          <span
            className="p-1 text-neutral-700 dark:text-neutral-300 rounded font-medium bg-neutral-100 dark:bg-neutral-800"
            style={{
              margin: '0 2px',
            }}
          >
            {props.children}
          </span>
        )
      }
      return props.children
    },
  }
}
