import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { handleImagePaste } from './image-paste-manager'
import type { ReactMdxNodeAttrs } from './react-mdx-types'

export const createImagePastePlugin = (editor: Editor, nodeType: any) => {
  return new Plugin({
    key: new PluginKey('imagePaste'),
    props: {
      handlePaste: (view, event) => {
        if (!event.clipboardData?.files.length) {
          return false
        }

        const imageFiles = Array.from(event.clipboardData.files).filter(
          (file) => file.type.startsWith('image/'),
        )

        if (!imageFiles.length) {
          return false
        }

        const { state, dispatch } = view
        const { tr, selection } = state
        const { from, to } = selection

        const $from = state.doc.resolve(from)
        const currentNode = $from.parent

        const isEmptyLine = currentNode.textContent.trim() === ''

        let insertPos: number

        if (isEmptyLine) {
          const $to = state.doc.resolve(to)
          const nodeStart = $from.before()
          const nodeEnd = $to.after()

          const attrs: ReactMdxNodeAttrs = {
            name: 'img',
            props: JSON.stringify({ urls: '', caption: '', loading: true }),
          }
          const firstNode = nodeType.create(attrs)
          tr.replaceRangeWith(nodeStart, nodeEnd, firstNode)
          insertPos = nodeStart

          const finalPos = insertPos
          setTimeout(() => {
            handleImagePaste(editor, imageFiles[0], finalPos)
          }, 0)

          insertPos += firstNode.nodeSize

          for (let i = 1; i < imageFiles.length; i++) {
            const attrs: ReactMdxNodeAttrs = {
              name: 'img',
              props: JSON.stringify({ urls: '', caption: '', loading: true }),
            }
            const node = nodeType.create(attrs)
            tr.insert(insertPos, node)

            const finalPos = insertPos
            setTimeout(() => {
              handleImagePaste(editor, imageFiles[i], finalPos)
            }, 0)

            insertPos += node.nodeSize
          }
        } else {
          insertPos = $from.after()

          imageFiles.forEach((file) => {
            const attrs: ReactMdxNodeAttrs = {
              name: 'img',
              props: JSON.stringify({ urls: '', caption: '', loading: true }),
            }
            const node = nodeType.create(attrs)
            tr.insert(insertPos, node)

            const finalPos = insertPos
            setTimeout(() => {
              handleImagePaste(editor, file, finalPos)
            }, 0)

            insertPos += node.nodeSize
          })
        }

        dispatch(tr)
        return true
      },
    },
  })
}
