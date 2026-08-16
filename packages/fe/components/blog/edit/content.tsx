'use client'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import DragHandle from '@tiptap/extension-drag-handle-react'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, EditorEvents, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { addHeadingAnchors } from '@utils/blog-toc'
import { debounce } from 'lodash'
import { all, createLowlight } from 'lowlight'
import { useTranslation } from 'next-i18next'
import React, { useRef, useState } from 'react'
import { DndHandler } from './editor/dnd'
import { EmptyLineParagraphExtension } from './editor/empty-line-extension'
import { ReactMdxNode } from './editor/react-mdx-node'
import { SelectionToolbar } from './editor/selection-toolbar'
import { SlashCommandMenu } from './editor/slash-command-menu'
import {
  AlignedHeadingExtension,
  TextAlignmentExtension,
} from './editor/text-alignment-extension'

const lowlight = createLowlight(all)

const syncHeadingIds = (editor: EditorEvents['update']['editor']) => {
  const { headingItems } = addHeadingAnchors(editor.getMarkdown())
  const headings = Array.from(
    editor.view.dom.querySelectorAll('h1, h2, h3, h4'),
  ) as HTMLHeadingElement[]

  headings.forEach((heading, index) => {
    const id = headingItems[index]?.id

    if (id) {
      heading.id = id
    } else {
      heading.removeAttribute('id')
    }
  })
}

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
      StarterKit.configure({
        dropcursor: {
          class: 'tiptap-drop-cursor',
        },
        paragraph: false, // we use custom EmptyLineParagraphExtension instead
        heading: false, // we use AlignedHeadingExtension to persist alignment
        hardBreak: false, // we use custom EmptyLineParagraphExtension instead
        link: {
          autolink: false,
          shouldAutoLink: () => false,
          protocols: ['https', 'http'],
          linkOnPaste: false,
          openOnClick: false,
          enableClickSelection: true,
          defaultProtocol: 'https',
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
      AlignedHeadingExtension,
      TextAlignmentExtension,
      ReactMdxNode,
    ],
    immediatelyRender: false,
    content: initValue,
    contentType: 'markdown',
    // eslint-disable-next-line react-hooks/refs
    onCreate: ({ editor }) => syncHeadingIds(editor),
    onUpdate: (event) => {
      syncHeadingIds(event.editor)
      handleUpdate.current(event)
    },
    autofocus: initValue ? undefined : 'all',
  })

  return (
    <>
      {editor && <SelectionToolbar editor={editor} />}
      {editor && <SlashCommandMenu editor={editor} />}
      <DragHandle editor={editor}>
        <DndHandler />
      </DragHandle>
      <EditorContent editor={editor} />
    </>
  )
}

export default Content
