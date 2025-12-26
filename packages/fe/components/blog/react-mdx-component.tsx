import React, { useEffect, useMemo, useState } from 'react'
import { ComponentMap } from './edit/editor/react-mdx-node'
import type { ReactMdxComponent as ReactMdxComponentType } from './edit/editor/react-mdx-types'

export interface ReactMdxComponentProps {
  name: string
  props: string
}

const LazyComponentWrapper: React.FC<{
  componentName: string
  parsedProps: Record<string, any>
}> = ({ componentName, parsedProps }) => {
  const [Component, setComponent] = useState<ReactMdxComponentType<any> | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    import(`./lazy/${componentName}`)
      .then((module) => {
        if (mounted) {
          setComponent(() => module.default)
          setLoading(false)
        }
      })
      .catch((error) => {
        if (mounted) {
          if (process.env.NODE_ENV === 'development') {
            console.error(
              `Failed to load lazy component: ${componentName}`,
              error,
            )
          }
          setComponent(null)
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [componentName])

  if (loading) {
    return <div className="text-neutral-500 text-sm italic">Loading...</div>
  }

  if (!Component) {
    return null
  }

  return <Component props={parsedProps} mode="mdx" />
}

export const ReactMdxComponent: React.FC<ReactMdxComponentProps> = ({
  name,
  props: propsJson,
}) => {
  const parsedProps = useMemo(() => {
    try {
      return JSON.parse(propsJson || '{}')
    } catch (error) {
      console.error('Failed to parse MDX component props:', error)
      return {}
    }
  }, [propsJson])

  if (name.startsWith('lazy.')) {
    const componentName = name.substring(5)
    return (
      <LazyComponentWrapper
        componentName={componentName}
        parsedProps={parsedProps}
      />
    )
  }

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

  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `ReactMdxComponent: Component definition missing for "${name}"`,
      )
    }
    return null
  }

  return <Component props={parsedProps} mode="mdx" />
}
