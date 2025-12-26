'use client'
import type { NodeViewProps } from '@tiptap/react'
import { NodeViewWrapper } from '@tiptap/react'
import React, { useCallback, useMemo } from 'react'
import { ComponentMap } from './react-mdx-node'
import type { ReactMdxNodeAttrs } from './react-mdx-types'

export const ReactMdxNodeView: React.FC<NodeViewProps> = (props) => {
  const { node, updateAttributes, selected } = props
  const { name, props: propsJson } = node.attrs as ReactMdxNodeAttrs

  const parsedProps = useMemo(() => {
    try {
      const parsed = JSON.parse(propsJson || '{}')
      return parsed
    } catch (error) {
      console.error(
        'Failed to parse component props:',
        error,
        'propsJson:',
        propsJson,
      )
      return {}
    }
  }, [propsJson])

  const componentEntry = ComponentMap[name]

  const handlePropsUpdate = useCallback(
    (newProps: Record<string, any>) => {
      try {
        const newPropsJson = JSON.stringify(newProps)
        updateAttributes({ props: newPropsJson })
      } catch (error) {
        console.error('Failed to serialize component props:', error)
      }
    },
    [updateAttributes],
  )

  if (!componentEntry) {
    return (
      <NodeViewWrapper className="react-mdx-node-wrapper">
        <div className="border-2 border-dashed border-red-300 dark:border-red-800 rounded p-4 my-2">
          <div className="text-red-600 dark:text-red-400 font-mono text-sm">
            Component not found: <strong>{name}</strong>
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            This component is not registered in the ComponentMap
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  const Component = componentEntry.component

  return (
    <NodeViewWrapper className="react-mdx-node-wrapper">
      <div
        className={`relative my-4 ${
          selected ? 'ring-2 ring-blue-500 ring-offset-2 rounded' : ''
        }`}
        contentEditable={false}
      >
        <Component
          props={parsedProps}
          onPropsUpdate={handlePropsUpdate}
          mode="editor"
        />
      </div>
    </NodeViewWrapper>
  )
}
