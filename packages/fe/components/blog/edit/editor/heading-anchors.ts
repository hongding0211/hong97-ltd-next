import { Extension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { addHeadingAnchors } from '@utils/blog-toc'

const headingAnchorsKey = new PluginKey<DecorationSet>('blogHeadingAnchors')

export const HeadingAnchors = Extension.create({
  name: 'blogHeadingAnchors',

  addProseMirrorPlugins() {
    const createDecorations = (doc: Node) => {
      const markdown = this.editor.storage.markdown.manager.serialize(
        doc.toJSON(),
      )
      const { headingItems } = addHeadingAnchors(markdown)
      const decorations: Decoration[] = []
      let index = 0

      doc.descendants((node, position) => {
        if (node.type.name !== 'heading' || node.attrs.level > 4) {
          return
        }
        const id = headingItems[index++]?.id
        if (id) {
          decorations.push(
            Decoration.node(position, position + node.nodeSize, { id }),
          )
        }
      })

      return DecorationSet.create(doc, decorations)
    }

    return [
      new Plugin<DecorationSet>({
        key: headingAnchorsKey,
        state: {
          init: (_, state) => createDecorations(state.doc),
          apply: (transaction, decorations) =>
            transaction.docChanged
              ? createDecorations(transaction.doc)
              : decorations,
        },
        props: {
          decorations: (state) => headingAnchorsKey.getState(state),
        },
      }),
    ]
  },
})
