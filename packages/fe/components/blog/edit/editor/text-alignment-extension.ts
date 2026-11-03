import { Extension, type JSONContent } from '@tiptap/core'
import { Heading } from '@tiptap/extension-heading'
import { wrapWavyUnderline } from '@utils/wavy-underline'

export type TextAlignment = 'left' | 'center' | 'right' | 'justify'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlignment: {
      setTextAlign: (alignment: TextAlignment) => ReturnType
      unsetTextAlign: () => ReturnType
    }
  }
}

const ALIGNABLE_TYPES = ['paragraph', 'heading']
const ALIGNMENTS: TextAlignment[] = ['left', 'center', 'right', 'justify']

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeAttribute = (value: string) =>
  escapeHtml(value).replace(/"/g, '&quot;')

const escapeText = (value: string) =>
  escapeHtml(value).replace(
    /[{}*_`[\]~\\]/g,
    (char) => `&#${char.charCodeAt(0)};`,
  )

const renderTextMarks = (node: JSONContent) => {
  let content = escapeText(node.text || '')

  for (const mark of node.marks || []) {
    switch (mark.type) {
      case 'bold':
        content = `<strong>${content}</strong>`
        break
      case 'italic':
        content = `<em>${content}</em>`
        break
      case 'underline':
        content = `<u>${content}</u>`
        break
      case 'wavyUnderline':
        content = wrapWavyUnderline(content, mark.attrs?.color)
        break
      case 'strike':
        content = `<s>${content}</s>`
        break
      case 'code':
        content = `<code>${content}</code>`
        break
      case 'link': {
        const href = escapeAttribute(String(mark.attrs?.href || ''))
        const title = mark.attrs?.title
          ? ` title="${escapeAttribute(String(mark.attrs.title))}"`
          : ''
        content = `<a href="${href}"${title}>${content}</a>`
        break
      }
    }
  }

  return content
}

export const hasWavyUnderline = (content: JSONContent[] = []) =>
  content.some((node) =>
    node.marks?.some((mark) => mark.type === 'wavyUnderline'),
  )

export const renderInlineHtml = (content: JSONContent[] = []) =>
  content
    .map((node) => {
      if (node.type === 'text') {
        return renderTextMarks(node)
      }
      if (node.type === 'hardBreak') {
        return '<br />'
      }
      return ''
    })
    .join('')

export const renderAlignedMarkdownBlock = (
  tag: 'p' | `h${number}`,
  alignment: TextAlignment,
  content: JSONContent[] = [],
) => `<${tag} align="${alignment}">${renderInlineHtml(content)}</${tag}>`

export const TextAlignmentExtension = Extension.create({
  name: 'textAlignment',

  addGlobalAttributes() {
    return [
      {
        types: ALIGNABLE_TYPES,
        attributes: {
          textAlign: {
            // Unset alignment inherits the article's default justification.
            default: null,
            parseHTML: (element) => {
              const value =
                element.getAttribute('align') || element.style.textAlign
              if (value === 'justify') {
                return null
              }
              return ALIGNMENTS.includes(value as TextAlignment) ? value : null
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign) {
                return {}
              }
              return { style: `text-align: ${attributes.textAlign}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment) =>
        ({ commands }) => {
          if (!ALIGNMENTS.includes(alignment)) {
            return false
          }

          if (alignment === 'justify') {
            return ALIGNABLE_TYPES.map((type) =>
              commands.resetAttributes(type, 'textAlign'),
            ).every(Boolean)
          }

          return ALIGNABLE_TYPES.map((type) =>
            commands.updateAttributes(type, { textAlign: alignment }),
          ).every(Boolean)
        },
      unsetTextAlign:
        () =>
        ({ commands }) =>
          ALIGNABLE_TYPES.map((type) =>
            commands.resetAttributes(type, 'textAlign'),
          ).every(Boolean),
    }
  },
})

export const AlignedHeadingExtension = Heading.extend({
  renderMarkdown: (node, helpers) => {
    const level = Number(node.attrs?.level) || 1
    const alignment = node.attrs?.textAlign as TextAlignment | undefined

    if (
      alignment === 'left' ||
      alignment === 'center' ||
      alignment === 'right' ||
      alignment === 'justify' ||
      hasWavyUnderline(node.content)
    ) {
      return renderAlignedMarkdownBlock(
        `h${level}`,
        alignment || 'justify',
        node.content || [],
      )
    }

    return `${'#'.repeat(level)} ${helpers.renderChildren(node.content || [])}`
  },
})
