import React from 'react'

export interface IReactMdxComponentProps<T = Record<string, any>> {
  props: T
  onPropsUpdate?: (newProps: T) => void
  mode?: 'editor' | 'mdx'
}

export type ReactMdxComponent<T = Record<string, any>> = React.FC<
  IReactMdxComponentProps<T>
>

export interface ComponentMapEntry {
  component?: ReactMdxComponent<any>
  displayName: string
  defaultProps?: Record<string, any>
  lazy?: boolean
  lazyLoader?: () => Promise<{ default: ReactMdxComponent<any> }>
}

export interface ReactMdxNodeAttrs {
  name: string
  props: string
}

export interface LazyComponentState {
  loading: boolean
  error: Error | null
  Component: ReactMdxComponent<any> | null
}
