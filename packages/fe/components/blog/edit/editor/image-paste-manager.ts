import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/react'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { toast } from '@utils/toast'

type PendingImageProps = {
  urls?: string
  caption?: string
  loop?: boolean
  loading?: boolean
  uploadId?: string
  [key: string]: unknown
}

const parseImageProps = (node: ProseMirrorNode): PendingImageProps => {
  const rawProps = node.attrs.props

  if (typeof rawProps !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(rawProps)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

const findPendingImageNode = (editor: Editor, uploadId: string) => {
  let matched: { node: ProseMirrorNode; pos: number } | null = null

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'reactMdxNode' || node.attrs.name !== 'img') {
      return true
    }

    if (parseImageProps(node).uploadId !== uploadId) {
      return true
    }

    matched = { node, pos }
    return false
  })

  return matched
}

export async function handleImagePaste(
  editor: Editor,
  imageFile: File,
  uploadId: string,
) {
  try {
    const webpFile = await convertImageToWebP(imageFile, 0.85, 1920)

    const filePath = await uploadFile2Oss(webpFile, 'blog')

    if (!filePath) {
      throw new Error('Upload failed')
    }

    if (editor.isDestroyed) {
      return
    }

    const matched = findPendingImageNode(editor, uploadId)

    if (!matched) {
      return
    }

    const currentProps = parseImageProps(matched.node)
    const { uploadId: _uploadId, ...restProps } = currentProps
    const nextProps: PendingImageProps = {
      ...restProps,
      urls: filePath,
      caption:
        typeof currentProps.caption === 'string' ? currentProps.caption : '',
      loading: false,
    }

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(matched.pos, undefined, {
        ...matched.node.attrs,
        props: JSON.stringify(nextProps),
      }),
    )
  } catch {
    if (editor.isDestroyed) {
      return
    }

    const matched = findPendingImageNode(editor, uploadId)

    if (!matched) {
      return
    }

    editor.view.dispatch(
      editor.state.tr.delete(matched.pos, matched.pos + matched.node.nodeSize),
    )
    toast('blog.uploadFailed', { type: 'error' })
  }
}
