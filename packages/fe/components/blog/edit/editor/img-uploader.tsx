import React from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { ImagesV2 } from '@components/common/images-v2'
import { convertImageToWebP, uploadFile2Oss } from '@utils/oss'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'next-i18next'

const ImageUploader: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected
}) => {
  const images = node.attrs.images || []
  const caption = node.attrs.caption || ''
  const autoLoop = node.attrs.autoLoop || false

  const { t } = useTranslation('blog')


  const handleUpload = async (files: File[]) => {
    const compressedFiles = await Promise.all(files.map(f => convertImageToWebP(f, 0.75, 1920)))
    const uploadFilesRes = await Promise.all(
      compressedFiles.map(f => uploadFile2Oss(f, 'blog'))
    )

    updateAttributes({
      images: [...node.attrs.images, ...uploadFilesRes.map(e => ({
        img: e,
      }))]
    })
  }

  const triggerFileInput = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      handleUpload(files)
    }
    input.click()
  }

  return (
    <NodeViewWrapper className={selected ? 'selected' : ''}>
      <div className="controls">
        <button onClick={triggerFileInput}>📷 上传图片 ({images.length})</button>
        <button onClick={deleteNode}>🗑️ 删除</button>
        <label>
          <input
            type="checkbox"
            checked={autoLoop}
            onChange={(e) => updateAttributes({ autoLoop: e.target.checked })}
          />
          自动轮播
        </label>
      </div>

      {images.length > 0 ? (
        <ImagesV2 images={images} autoLoop={autoLoop} />
      ) : (
        <div className="empty">点击上传图片</div>
      )}

      <Input
        placeholder={t('edit.addImgCaption')}
      />
    </NodeViewWrapper>
  )
}

export default ImageUploader