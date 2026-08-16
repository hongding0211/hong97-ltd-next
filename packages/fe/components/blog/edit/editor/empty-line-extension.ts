import { Paragraph } from '@tiptap/extension-paragraph'
import {
  type TextAlignment,
  renderAlignedMarkdownBlock,
} from './text-alignment-extension'

export const EmptyLineParagraphExtension = Paragraph.extend({
  /**
   * Override Markdown rendering to preserve empty paragraphs.
   *
   * Normal paragraphs are rendered as usual, but empty paragraphs are
   * converted to <br> tags which are preserved by markdown parsers.
   */
  renderMarkdown: (node, helpers) => {
    const content = helpers.renderChildren(node.content ?? [])
    const alignment = node.attrs?.textAlign as TextAlignment | undefined

    // Check if this is an empty paragraph
    if (!content || content.trim() === '') {
      // Render as <br> tag instead of empty paragraph
      // This will be preserved in markdown and parsed back correctly
      return '<br />'
    }

    if (alignment === 'center' || alignment === 'right') {
      return renderAlignedMarkdownBlock('p', alignment, node.content || [])
    }

    // Normal paragraph rendering
    return content
  },
})
