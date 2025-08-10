import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/textarea'
import { http } from '@services/http'
import { CreateTrashDto } from '@services/trash/types'
import { toast } from '@utils/toast'
import { Loader2, PlusCircle } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useEffect, useRef, useState } from 'react'
import ImageUploader, { ImageUploaderRef } from '../common/ImageUploader'

interface CreateTrashFormProps {
  onSuccess?: () => void
}

const Form: React.FC<{
  content: string
  imageUrls: string[]
  setContent: (value: string) => void
  setImageUrls: (value: string[]) => void
  disabled?: boolean
  onKeyApply?: () => void
  imageUploaderRef: React.RefObject<ImageUploaderRef>
  autoFocus?: boolean
}> = (props) => {
  const {
    content,
    imageUrls,
    setContent,
    setImageUrls,
    disabled,
    onKeyApply,
    imageUploaderRef,
    autoFocus = false,
  } = props

  const { t } = useTranslation('trash')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      // 延迟一下确保 Dialog/Drawer 动画完成后再聚焦
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, disabled])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') {
      return
    }
    onKeyApply?.()
  }

  return (
    <>
      <div className="flex flex-col gap-y-4 pb-4">
        <div className="flex flex-col gap-y-3">
          <Textarea
            ref={textareaRef}
            id="content"
            placeholder={t('form.contentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none text-sm"
            disabled={disabled}
            onKeyDown={handleKeyDown}
            required
          />
        </div>

        <div className="flex flex-col gap-y-3">
          <ImageUploader
            ref={imageUploaderRef}
            value={imageUrls}
            onChange={setImageUrls}
            maxCount={9}
            disabled={disabled}
            className=""
            showHint={false}
          />
        </div>
      </div>
    </>
  )
}

export function CreateTrashForm({ onSuccess }: CreateTrashFormProps) {
  const { t } = useTranslation('trash')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const imageUploaderRef = useRef<ImageUploaderRef>(null)

  const isDesktop =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Upload all images first
      let finalImageUrls: string[] = []
      if (imageUploaderRef.current) {
        finalImageUrls = await imageUploaderRef.current.uploadAll()
      }

      // Validate: must have either content or images
      const hasContent = content.trim()
      const hasImages = finalImageUrls.length > 0

      if (!hasContent && !hasImages) {
        toast(t('form.contentOrImageRequired'), { type: 'error' })
        return
      }

      const createData: CreateTrashDto = {
        ...(hasContent && { content: content.trim() }),
        ...(hasImages && {
          media: finalImageUrls.map((imageUrl) => ({ imageUrl })),
        }),
      }

      const response = await http.post('PostCreateTrash', createData)

      if (response.isSuccess) {
        toast(t('form.publishSuccess'), { type: 'success' })
        setContent('')
        setImageUrls([])
        setIsOpen(false)
        onSuccess?.()
      } else {
        toast(response.msg || t('form.publishFailed'), { type: 'error' })
      }
    } catch (error) {
      console.error('Create trash error:', error)
      toast(t('form.publishFailed'), { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const Trigger = (
    <Button className="flex items-center gap-2" variant="ghost">
      <PlusCircle className="w-4 h-4" />
      {t('form.publishButton')}
    </Button>
  )

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{Trigger}</DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('form.title')}</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <Form
              content={content}
              imageUrls={imageUrls}
              setContent={setContent}
              setImageUrls={setImageUrls}
              disabled={loading}
              onKeyApply={handleSubmit}
              imageUploaderRef={imageUploaderRef}
              autoFocus={isOpen}
            />
          </div>
          <div className="grid mt-2 grid-cols-2 gap-x-2">
            <Button
              variant="ghost"
              disabled={loading}
              onClick={() => setIsOpen(false)}
            >
              {t('form.cancel')}
            </Button>
            <Button disabled={loading} onClick={handleSubmit}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? t('form.publishing') : t('form.publish')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t('form.title')}</DrawerTitle>
        </DrawerHeader>
        <div className="py-6 pt-4 px-4">
          <Form
            content={content}
            imageUrls={imageUrls}
            setContent={setContent}
            setImageUrls={setImageUrls}
            disabled={loading}
            onKeyApply={handleSubmit}
            imageUploaderRef={imageUploaderRef}
            autoFocus={isOpen}
          />
        </div>
        <DrawerFooter className="pt-2">
          <div className="grid grid-cols-2 gap-x-2">
            <DrawerClose asChild>
              <Button variant="ghost" disabled={loading}>
                {t('form.cancel')}
              </Button>
            </DrawerClose>
            <Button disabled={loading} onClick={handleSubmit}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? t('form.publishing') : t('form.publish')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
