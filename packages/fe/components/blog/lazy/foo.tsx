import React from 'react'
import type { ReactMdxComponent } from '../edit/editor/react-mdx-types'

interface FooProps {
  message?: string
  color?: string
}

const Foo: ReactMdxComponent<FooProps> = ({ props, mode }) => {
  const { message = 'Hello from Foo!', color = '#10b981' } = props

  return (
    <div
      className="p-6 rounded-lg my-4 border-l-4"
      style={{
        backgroundColor: `${color}10`,
        borderLeftColor: color,
      }}
    >
      <div className="text-lg font-semibold" style={{ color }}>
        {message}
      </div>
      {mode === 'editor' && (
        <div className="text-xs text-neutral-400 mt-2">Mode: {mode}</div>
      )}
    </div>
  )
}

export default Foo
