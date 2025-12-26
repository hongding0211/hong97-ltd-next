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
        let currentPos = selection.to

        imageFiles.forEach((file) => {
          const attrs: ReactMdxNodeAttrs = {
            name: 'img',
            props: JSON.stringify({ urls: '', caption: '' }),
          }
          const node = nodeType.create(attrs)
          tr.insert(currentPos, node)

          setTimeout(() => {
            handleImagePaste(editor, file, currentPos)
          }, 0)

          currentPos += node.nodeSize
        })

        dispatch(tr)
        return true
      },
    },
  })
}
