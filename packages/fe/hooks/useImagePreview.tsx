import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ImagesV2 } from '@components/common/images-v2'
import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ImagePreviewImage {
  img: string
  video?: string
  autoPlay?: boolean
  caption?: string
}

interface UseImagePreviewReturn {
  component: React.ReactElement
  show: (images: ImagePreviewImage[], initialIndex?: number) => void
  hide: () => void
  isVisible: boolean
}

export function useImagePreview(): UseImagePreviewReturn {
  const [isVisible, setIsVisible] = useState(false)
  const [images, setImages] = useState<ImagePreviewImage[]>([])
  const [initialIndex, setInitialIndex] = useState(0)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640) // sm breakpoint
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const show = useCallback((newImages: ImagePreviewImage[], index = 0) => {
    setImages(newImages)
    setInitialIndex(index)
    setIsVisible(true)
  }, [])

  const hide = useCallback(() => {
    setIsVisible(false)
    // 延迟清空数据，避免关闭动画时看到空白
    setTimeout(() => {
      setImages([])
      setInitialIndex(0)
    }, 200)
  }, [])

  // 重新排列图片数组，将选中的图片放到第一位
  const reorderedImages =
    images.length > 0
      ? [...images.slice(initialIndex), ...images.slice(0, initialIndex)]
      : []

  const component = (
    <Dialog open={isVisible} onOpenChange={(open) => !open && hide()}>
      <DialogContent
        className={`
          max-w-full max-h-full p-0 border-0 bg-black md:bg-transparent dark:md:bg-transparent shadow-none
          ${isSmallScreen ? 'w-screen h-screen' : 'w-[90vw] h-[90vh] max-w-4xl'}
        `}
      >
        {/* 关闭按钮 */}
        <div
          onClick={hide}
          className="absolute cursor-pointer top-4 right-4 md:top-0 md:right-0 z-50 p-2 rounded-full text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </div>

        {/* 图片展示区域 */}
        <div
          className="w-full h-full flex items-center justify-center"
          onClick={hide}
        >
          <div
            className={`
              w-full
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {reorderedImages.length > 0 && (
              <ImagesV2 images={reorderedImages} autoLoop={false} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return {
    component,
    show,
    hide,
    isVisible,
  }
}
