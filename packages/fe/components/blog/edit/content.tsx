'use client'
import DragHandle from '@tiptap/extension-drag-handle-react'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, EditorEvents, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { toast } from '@utils/toast'
import { debounce } from 'lodash'
import { all, createLowlight } from 'lowlight'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useRef, useState } from 'react'
import { CodeBlockWithLanguage } from './editor/code-block-extension'
import { DndHandler } from './editor/dnd'
import { EmptyLineParagraphExtension } from './editor/empty-line-extension'
import { HeadingAnchors } from './editor/heading-anchors'
import { hasUnexpectedFencedCodeLoss } from './editor/markdown-integrity'
import { NativeParagraphScroll } from './editor/native-paragraph-scroll'
import { ReactMdxNode } from './editor/react-mdx-node'
import { SelectionToolbar } from './editor/selection-toolbar'
import { SlashCommandMenu } from './editor/slash-command-menu'
import {
  AlignedHeadingExtension,
  TextAlignmentExtension,
} from './editor/text-alignment-extension'
import { WavyUnderline } from './editor/wavy-underline-extension'

const lowlight = createLowlight(all)

interface IContent {
  value: string
  onValueChange: (v: string) => void
  mobileToolbarContainer: HTMLDivElement | null
  onFlushReady?: (flush: (() => boolean) | null) => void
}

const Content: React.FC<IContent> = (props) => {
  const { value, onValueChange, mobileToolbarContainer, onFlushReady } = props

  const [initValue] = useState(value)

  const initializationDeadlineRef = useRef(Number.POSITIVE_INFINITY)
  const integrityCheckTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const saveBlockedRef = useRef(false)
  const warningShownRef = useRef(false)

  const handleUpdate = useRef(
    debounce((e: EditorEvents['update']) => {
      const md = e.editor.getMarkdown()
      onValueChange(md)
    }, 300),
  )

  const { t } = useTranslation('blog')

  const validateInitialContent = (editor: EditorEvents['update']['editor']) => {
    if (saveBlockedRef.current) {
      return false
    }

    if (!hasUnexpectedFencedCodeLoss(initValue, editor.getMarkdown())) {
      return true
    }

    saveBlockedRef.current = true
    handleUpdate.current.cancel()

    if (!warningShownRef.current) {
      warningShownRef.current = true
      toast(t('edit.contentCompatibilityError'), { type: 'error' })
    }

    return false
  }

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
      HeadingAnchors,
      NativeParagraphScroll,
      CodeBlockWithLanguage.configure({
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
      WavyUnderline,
      ReactMdxNode,
    ],
    immediatelyRender: false,
    content: initValue,
    contentType: 'markdown',
    onCreate: () => {
      initializationDeadlineRef.current = Date.now() + 3000
      integrityCheckTimersRef.current = [0, 250, 1000, 2500].map((delay) =>
        setTimeout(() => validateInitialContent(editor), delay),
      )
    },
    onUpdate: (event) => {
      if (
        saveBlockedRef.current ||
        (Date.now() <= initializationDeadlineRef.current &&
          !validateInitialContent(event.editor))
      ) {
        return
      }

      handleUpdate.current(event)
    },
    onDestroy: () => {
      integrityCheckTimersRef.current.forEach(clearTimeout)
      integrityCheckTimersRef.current = []
      handleUpdate.current.cancel()
    },
    autofocus: initValue ? undefined : 'all',
  })

  useEffect(() => {
    if (!editor || !onFlushReady) return
    onFlushReady(() => {
      if (
        saveBlockedRef.current ||
        (Date.now() <= initializationDeadlineRef.current &&
          !validateInitialContent(editor))
      )
        return false
      handleUpdate.current.flush()
      return true
    })
    return () => onFlushReady(null)
  }, [editor, onFlushReady])

  return (
    <>
      {editor && (
        <SelectionToolbar
          editor={editor}
          mobileToolbarContainer={mobileToolbarContainer}
        />
      )}
      {editor && <SlashCommandMenu editor={editor} />}
      <DragHandle editor={editor}>
        <DndHandler />
      </DragHandle>
      <EditorContent editor={editor} />
    </>
  )
}

export default Content
