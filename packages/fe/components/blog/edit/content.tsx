'use client'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import DragHandle from '@tiptap/extension-drag-handle-react'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, EditorEvents, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { debounce } from 'lodash'
import { all, createLowlight } from 'lowlight'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DndHandler } from './editor/dnd'
import { EmptyLineParagraphExtension } from './editor/empty-line-extension'
import { ReactMdxNode } from './editor/react-mdx-node'

const lowlight = createLowlight(all)

interface IContent {
  value: string
  onValueChange: (v: string) => void
}

const Content: React.FC<IContent> = (props) => {
  const { value, onValueChange } = props

  const [initValue] = useState(value)

  const onValueChangeRef = useRef(onValueChange)

  useEffect(() => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])

  const handleUpdate = useMemo(
    () =>
      debounce((e: EditorEvents['update']) => {
        const md = e.editor.getMarkdown()
        onValueChangeRef.current(md)
      }, 300),
    [],
  )

  useEffect(() => {
    return () => {
      handleUpdate.cancel()
    }
  }, [handleUpdate])

  const { t } = useTranslation('blog')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        dropcursor: {
          class: 'tiptap-drop-cursor',
        },
        paragraph: false, // we use custom EmptyLineParagraphExtension instead
        hardBreak: false, // we use custom EmptyLineParagraphExtension instead
        link: {
          autolink: false,
          shouldAutoLink: () => false,
          protocols: ['https', 'http'],
          linkOnPaste: false,
        },
      }),
      Markdown.configure({
        indentation: {
          style: 'space',
          size: 2,
        },
        markedOptions: {
          gfm: true,
          breaks: true,
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        enableTabIndentation: true,
        tabSize: 2,
        defaultLanguage: 'plaintext',
      }),
      Placeholder.configure({
        placeholder: t('edit.startEdit'),
        showOnlyWhenEditable: false,
      }),
      EmptyLineParagraphExtension.configure({
        HTMLAttributes: {},
      }),
      ReactMdxNode,
    ],
    immediatelyRender: false,
    content: initValue,
    contentType: 'markdown',
    onUpdate: handleUpdate,
    autofocus: initValue ? undefined : 'all',
  })

  return (
    <>
      <DragHandle editor={editor}>
        <DndHandler />
      </DragHandle>
      <EditorContent editor={editor} />
    </>
  )
}

export default Content
