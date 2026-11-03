import { Mark } from '@tiptap/core'
import {
  type WaveColor,
  normalizeWaveColor,
  wrapWavyUnderline,
} from '@utils/wavy-underline'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wavyUnderline: {
      setWavyUnderline: (color?: WaveColor) => ReturnType
      unsetWavyUnderline: () => ReturnType
    }
  }
}

export const WavyUnderline = Mark.create({
  name: 'wavyUnderline',

  addAttributes() {
    return {
      color: {
        default: 'blue',
        parseHTML: (element) =>
          normalizeWaveColor(element.getAttribute('data-wave')),
        renderHTML: (attributes) => ({
          'data-wave': normalizeWaveColor(attributes.color),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-wave]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },

  renderMarkdown(node, helpers) {
    return wrapWavyUnderline(helpers.renderChildren(node), node.attrs?.color)
  },

  addCommands() {
    return {
      setWavyUnderline:
        (color = 'blue') =>
        ({ chain }) =>
          chain()
            .unsetMark('underline')
            .setMark(this.name, { color: normalizeWaveColor(color) })
            .run(),
      unsetWavyUnderline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})
