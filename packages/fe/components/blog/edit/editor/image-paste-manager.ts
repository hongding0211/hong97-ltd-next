import type { Editor } from '@tiptap/react'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { toast } from '@utils/toast'

export async function handleImagePaste(
  editor: Editor,
  imageFile: File,
  initialPos: number,
) {
  try {
    const webpFile = await convertImageToWebP(imageFile, 0.75, 1920)

    const filePath = await uploadFile2Oss(webpFile, 'blog')

    if (!filePath) {
      throw new Error('Upload failed')
    }

    const node = editor.state.doc.nodeAt(initialPos)

    if (node?.type.name === 'reactMdxNode' && node.attrs.name === 'img') {
      editor
        .chain()
        .focus()
        .setNodeSelection(initialPos)
        .updateAttributes('reactMdxNode', {
          props: JSON.stringify({
            urls: filePath,
            caption: '',
            loading: false,
          }),
        })
        .run()
    }
  } catch {
    const node = editor.state.doc.nodeAt(initialPos)
    if (node?.type.name === 'reactMdxNode' && node.attrs.name === 'img') {
      editor
        .chain()
        .focus()
        .setNodeSelection(initialPos)
        .deleteSelection()
        .run()
    }
    toast('blog.uploadFailed', { type: 'error' })
  }
}
