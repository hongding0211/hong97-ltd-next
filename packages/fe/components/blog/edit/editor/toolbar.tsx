'use client'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { PopoverClose } from '@radix-ui/react-popover'
import type { Editor } from '@tiptap/react'
import cx from 'classnames'
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Puzzle,
  Quote,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ComponentMap } from './react-mdx-node'
import type { ReactMdxNodeAttrs } from './react-mdx-types'

interface EditorToolbarProps {
  editor: Editor | null
}

interface ToolbarButtonProps {
  active?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}

const toolbarButtonClass = 'h-7 w-7 p-0 text-neutral-600 dark:text-neutral-300'

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active,
  disabled,
  label,
  onClick,
  children,
}) => {
  return (
    <Button
      type="button"
      size="xxs"
      variant="ghost"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(toolbarButtonClass, {
        'bg-neutral-200 text-neutral-950 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800':
          active,
      })}
    >
      {children}
    </Button>
  )
}

const ToolbarDivider = () => (
  <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800" />
)

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const [, setVersion] = useState(0)

  useEffect(() => {
    if (!editor) {
      return
    }

    const update = () => setVersion((v) => v + 1)

    editor.on('selectionUpdate', update)
    editor.on('transaction', update)

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  const componentEntries = useMemo(
    () =>
      Object.entries(ComponentMap).map(([name, entry]) => ({
        name,
        displayName: entry.displayName,
      })),
    [],
  )

  const run = useCallback(
    (command: (editor: Editor) => boolean) => {
      if (!editor) {
        return
      }

      command(editor)
    },
    [editor],
  )

  const insertMdxComponent = useCallback(
    (name: string) => {
      if (!editor) {
        return
      }

      const entry = ComponentMap[name]

      if (!entry) {
        return
      }

      const attrs: ReactMdxNodeAttrs = {
        name,
        props: JSON.stringify(entry.defaultProps || {}),
      }

      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'reactMdxNode',
            attrs,
          },
          {
            type: 'paragraph',
          },
        ])
        .run()
    },
    [editor],
  )

  const disabled = !editor

  return (
    <div className="sticky top-[113px] z-40 mb-3 flex max-w-full items-center overflow-x-auto rounded-md border border-neutral-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-black/80">
      <ToolbarButton
        label="Heading 2"
        disabled={disabled}
        active={editor?.isActive('heading', { level: 2 })}
        onClick={() =>
          run((editor) =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
          )
        }
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        disabled={disabled}
        active={editor?.isActive('heading', { level: 3 })}
        onClick={() =>
          run((editor) =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
          )
        }
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Bold"
        disabled={disabled}
        active={editor?.isActive('bold')}
        onClick={() =>
          run((editor) => editor.chain().focus().toggleBold().run())
        }
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        disabled={disabled}
        active={editor?.isActive('italic')}
        onClick={() =>
          run((editor) => editor.chain().focus().toggleItalic().run())
        }
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Bullet list"
        disabled={disabled}
        active={editor?.isActive('bulletList')}
        onClick={() =>
          run((editor) => editor.chain().focus().toggleBulletList().run())
        }
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        disabled={disabled}
        active={editor?.isActive('orderedList')}
        onClick={() =>
          run((editor) => editor.chain().focus().toggleOrderedList().run())
        }
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        disabled={disabled}
        active={editor?.isActive('blockquote')}
        onClick={() =>
          run((editor) => editor.chain().focus().toggleBlockquote().run())
        }
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        disabled={disabled}
        active={editor?.isActive('codeBlock')}
        onClick={() =>
          run((editor) => editor.chain().focus().toggleCodeBlock().run())
        }
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        label="Image"
        disabled={disabled}
        onClick={() => insertMdxComponent('img')}
      >
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="xxs"
            variant="ghost"
            disabled={disabled}
            aria-label="Insert component"
            title="Insert component"
            className={toolbarButtonClass}
          >
            <Puzzle className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-56 p-1"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex flex-col gap-0.5">
            {componentEntries.map((component) => (
              <PopoverClose key={component.name} asChild>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="justify-start font-normal"
                  onClick={() => insertMdxComponent(component.name)}
                >
                  <span className="truncate">{component.displayName}</span>
                  <span className="ml-auto max-w-[7rem] truncate font-mono text-[0.7rem] opacity-50">
                    {component.name}
                  </span>
                </Button>
              </PopoverClose>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
