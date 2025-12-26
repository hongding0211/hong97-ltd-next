'use client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import React, { useCallback, useMemo, useState } from 'react'
import type { ReactMdxComponent } from '../react-mdx-types'

interface LazyEditorProps {
  componentName: string
  propsJson: string
  onPropsUpdate: (newProps: Record<string, any>) => void
  LazyComponent: ReactMdxComponent<any> | null
  loading: boolean
  error: Error | null
}

export const LazyEditor: React.FC<LazyEditorProps> = ({
  componentName,
  propsJson,
  onPropsUpdate,
  LazyComponent,
  loading,
  error,
}) => {
  const [jsonInput, setJsonInput] = useState(propsJson)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const parsedProps = useMemo(() => {
    try {
      return JSON.parse(propsJson)
    } catch {
      return {}
    }
  }, [propsJson])

  const handleApply = useCallback(() => {
    try {
      const newProps = JSON.parse(jsonInput)
      setJsonError(null)
      onPropsUpdate(newProps)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }, [jsonInput, onPropsUpdate])

  const handleFormat = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(jsonInput), null, 2)
      setJsonInput(formatted)
      setJsonError(null)
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }, [jsonInput])

  return (
    <div className="space-y-1 py-2 px-3 pb-2 border-[1.5px] border-dashed border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Component: <span className="font-mono">{componentName}</span>
        </div>
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" onClick={handleFormat}>
            Format JSON
          </Button>
          <Button size="xs" variant="outline" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="props-editor">Props (JSON)</Label>
        <Textarea
          id="props-editor"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="font-mono text-xs min-h-[120px] mt-2"
          spellCheck={false}
        />
        {jsonError && (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
            Invalid JSON: {jsonError}
          </div>
        )}
      </div>

      <div>
        <Label>Preview</Label>
        {loading && (
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
            <span className="text-sm">Loading component...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              Failed to load component: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && LazyComponent && (
          <LazyComponent props={parsedProps} mode="editor" />
        )}

        {!loading && !error && !LazyComponent && (
          <div className="text-sm text-neutral-500 italic mt-2">
            Component not found
          </div>
        )}
      </div>
    </div>
  )
}
