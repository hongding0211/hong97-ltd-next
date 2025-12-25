'use client'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, EditorEvents, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { debounce } from 'lodash'
import { useTranslation } from 'next-i18next'
import React, { useRef, useState } from 'react'

interface IContent {
  value: string
  onValueChange: (v: string) => void
}

const Content: React.FC<IContent> = (props) => {
  const { value, onValueChange } = props

  const [initValue] = useState(value)

  const handleUpdate = useRef(
    debounce((e: EditorEvents['update']) => {
      const md = e.editor.getMarkdown()
      onValueChange(md)
    }, 300),
  )

  const { t } = useTranslation('blog')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder: t('edit.startEdit'),
        showOnlyWhenEditable: false,
      }),
    ],
    immediatelyRender: false,
    content: initValue,
    contentType: 'markdown',
    // eslint-disable-next-line react-hooks/refs
    onUpdate: handleUpdate.current,
    autofocus: 'all',
  })

  return <EditorContent editor={editor} />
}

export default Content
