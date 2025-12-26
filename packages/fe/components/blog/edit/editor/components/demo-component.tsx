import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import React from 'react'
import type { ReactMdxComponent } from '../react-mdx-types'

interface DemoProps {
  title: string
  description: string
  color: string
}

export const DemoComponent: ReactMdxComponent<DemoProps> = ({
  props,
  onPropsUpdate,
  mode,
}) => {
  const {
    title = 'Demo Title',
    description = 'Demo Description',
    color = '#3b82f6',
  } = props

  if (mode === 'editor' && onPropsUpdate) {
    return (
      <div className="space-y-4 p-4 border rounded bg-neutral-50 dark:bg-neutral-900">
        <div className="text-sm font-medium text-neutral-500">
          Demo Component (Editing Mode)
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => onPropsUpdate({ ...props, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) =>
              onPropsUpdate({ ...props, description: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            type="color"
            value={color}
            onChange={(e) => onPropsUpdate({ ...props, color: e.target.value })}
          />
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-neutral-500 mb-2">Preview:</div>
          <DemoComponentPreview
            title={title}
            description={description}
            color={color}
          />
        </div>
      </div>
    )
  }

  return (
    <DemoComponentPreview
      title={title}
      description={description}
      color={color}
    />
  )
}

const DemoComponentPreview: React.FC<DemoProps> = ({
  title,
  description,
  color,
}) => {
  return (
    <div
      className="p-6 rounded-lg my-4"
      style={{
        backgroundColor: color + '20',
        borderLeft: `4px solid ${color}`,
      }}
    >
      <h3 className="text-xl font-bold mb-2" style={{ color }}>
        {title}
      </h3>
      <p className="text-neutral-700 dark:text-neutral-300">{description}</p>
    </div>
  )
}
