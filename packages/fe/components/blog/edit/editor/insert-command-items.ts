import { ComponentMap } from '@components/blog/react-mdx-registry'
import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import {
  Blocks,
  Code2,
  Heading1,
  Heading2,
  Image as ImageIcon,
} from 'lucide-react'
import type React from 'react'

export interface InsertCommandRange {
  from: number
  to: number
  replaceBlock?: boolean
}

export interface InsertCommandItem {
  id: string
  label: string
  keywords: string[]
  Icon: React.ComponentType<{ className?: string }>
  run: (editor: Editor, range: InsertCommandRange) => void
}

const insertComponent = (
  editor: Editor,
  range: InsertCommandRange,
  name: string,
  defaultProps: Record<string, any>,
) => {
  const { state, view } = editor
  const componentType = state.schema.nodes.reactMdxNode
  const paragraphType = state.schema.nodes.paragraph

  if (!componentType || !paragraphType) {
    return
  }

  const $from = state.doc.resolve(range.from)
  const $to = state.doc.resolve(range.to)
  const blockFrom = $from.before()
  const blockTo = $to.after()
  const componentNode = componentType.create({
    name,
    props: JSON.stringify(defaultProps),
  })
  const paragraphNode = paragraphType.create()
  const replaceCurrentBlock =
    range.replaceBlock ||
    ($from.parent.type.name === 'paragraph' && !$from.parent.content.size)
  const insertAt = replaceCurrentBlock ? blockFrom : $from.after()
  const transaction = replaceCurrentBlock
    ? state.tr.replaceWith(blockFrom, blockTo, [componentNode, paragraphNode])
    : state.tr.insert(insertAt, [componentNode, paragraphNode])

  transaction.setSelection(
    TextSelection.create(
      transaction.doc,
      insertAt + componentNode.nodeSize + 1,
    ),
  )
  view.dispatch(transaction.scrollIntoView())
  view.focus()
}

const insertTextBlock = (
  editor: Editor,
  range: InsertCommandRange,
  typeName: 'heading' | 'codeBlock',
  attrs: Record<string, unknown> = {},
) => {
  const { state, view } = editor
  const $from = state.doc.resolve(range.from)
  const currentBlockIsEmpty =
    $from.parent.type.name === 'paragraph' && !$from.parent.content.size

  if (range.replaceBlock || currentBlockIsEmpty) {
    const chain = editor.chain().focus().deleteRange(range)
    if (typeName === 'heading') {
      chain.setHeading({ level: attrs.level as 1 | 2 }).run()
    } else {
      chain.setCodeBlock().run()
    }
    return
  }

  const blockType = state.schema.nodes[typeName]
  if (!blockType) {
    return
  }

  const insertAt = $from.after()
  const transaction = state.tr.insert(insertAt, blockType.create(attrs))
  transaction.setSelection(TextSelection.create(transaction.doc, insertAt + 1))
  view.dispatch(transaction.scrollIntoView())
  view.focus()
}

export const createInsertCommandItems = (): InsertCommandItem[] => {
  const blockItems: InsertCommandItem[] = [
    {
      id: 'heading-1',
      label: 'Heading 1',
      keywords: ['h1', 'heading', 'title'],
      Icon: Heading1,
      run: (editor, range) => {
        insertTextBlock(editor, range, 'heading', { level: 1 })
      },
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      keywords: ['h2', 'heading', 'subtitle'],
      Icon: Heading2,
      run: (editor, range) => {
        insertTextBlock(editor, range, 'heading', { level: 2 })
      },
    },
    {
      id: 'code-block',
      label: 'Code Block',
      keywords: ['code', 'codeblock'],
      Icon: Code2,
      run: (editor, range) => {
        insertTextBlock(editor, range, 'codeBlock')
      },
    },
  ]

  const componentItems = Object.entries(ComponentMap)
    .filter(([, entry]) => !entry.lazy && Boolean(entry.component))
    .map<InsertCommandItem>(([name, entry]) => ({
      id: `component-${name}`,
      label: entry.displayName,
      keywords: [name, 'component'],
      Icon: name === 'img' ? ImageIcon : Blocks,
      run: (editor, range) => {
        insertComponent(editor, range, name, entry.defaultProps || {})
      },
    }))

  return [...blockItems, ...componentItems]
}
