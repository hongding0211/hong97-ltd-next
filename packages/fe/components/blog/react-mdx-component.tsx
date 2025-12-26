import React from 'react'
import { ComponentMap } from './edit/editor/react-mdx-node'

export interface ReactMdxComponentProps {
  name: string
  props: string
}

export const ReactMdxComponent: React.FC<ReactMdxComponentProps> = ({
  name,
  props: propsJson,
}) => {
  const parsedProps = React.useMemo(() => {
    try {
      return JSON.parse(propsJson || '{}')
    } catch (error) {
      console.error('Failed to parse MDX component props:', error)
      return {}
    }
  }, [propsJson])

  const componentEntry = ComponentMap[name]

  if (!componentEntry) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `ReactMdxComponent: Component "${name}" not found in registry`,
      )
    }
    return null
  }

  const Component = componentEntry.component

  return <Component props={parsedProps} mode="mdx" />
}
