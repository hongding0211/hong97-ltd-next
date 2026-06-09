import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { handleImagePaste } from './image-paste-manager'
import type { ReactMdxNodeAttrs } from './react-mdx-types'

const createUploadId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`

const createPendingImageAttrs = (uploadId: string): ReactMdxNodeAttrs => ({
  name: 'img',
  props: JSON.stringify({
    urls: '',
    caption: '',
    loop: false,
    loading: true,
    uploadId,
  }),
})

const getImageFiles = (files: FileList | null | undefined) => {
  if (!files?.length) {
    return []
  }

  return Array.from(files).filter((file) => file.type.startsWith('image/'))
}

export const createImagePastePlugin = (editor: Editor, nodeType: any) => {
  return new Plugin({
    key: new PluginKey('imagePaste'),
    props: {
      handlePaste: (view, event) => {
        const imageFiles = getImageFiles(event.clipboardData?.files)

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

          const uploadId = createUploadId()
          const attrs = createPendingImageAttrs(uploadId)
          const firstNode = nodeType.create(attrs)
          tr.replaceRangeWith(nodeStart, nodeEnd, firstNode)
          insertPos = nodeStart

          setTimeout(() => {
            handleImagePaste(editor, imageFiles[0], uploadId)
          }, 0)

          insertPos += firstNode.nodeSize

          for (let i = 1; i < imageFiles.length; i++) {
            const uploadId = createUploadId()
            const attrs = createPendingImageAttrs(uploadId)
            const node = nodeType.create(attrs)
            tr.insert(insertPos, node)

            setTimeout(() => {
              handleImagePaste(editor, imageFiles[i], uploadId)
            }, 0)

            insertPos += node.nodeSize
          }
        } else {
          insertPos = $from.after()

          imageFiles.forEach((file) => {
            const uploadId = createUploadId()
            const attrs = createPendingImageAttrs(uploadId)
            const node = nodeType.create(attrs)
            tr.insert(insertPos, node)

            setTimeout(() => {
              handleImagePaste(editor, file, uploadId)
            }, 0)

            insertPos += node.nodeSize
          })
        }

        dispatch(tr)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) {
          return false
        }

        const imageFiles = getImageFiles(event.dataTransfer?.files)

        if (!imageFiles.length) {
          return false
        }

        event.preventDefault()

        const insertPos =
          view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          })?.pos ?? view.state.selection.from

        const content = imageFiles.flatMap((file) => {
          const uploadId = createUploadId()

          setTimeout(() => {
            handleImagePaste(editor, file, uploadId)
          }, 0)

          return [
            {
              type: 'reactMdxNode',
              attrs: createPendingImageAttrs(uploadId),
            },
          ]
        })

        editor.chain().focus().insertContentAt(insertPos, content).run()

        return true
      },
    },
  })
}
