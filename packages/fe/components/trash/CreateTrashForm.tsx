import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { http } from '@services/http'
import { CreateTrashDto } from '@services/trash/types'
import { toast } from '@utils/toast'
import { PlusCircle, X } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useState } from 'react'

interface CreateTrashFormProps {
  onSuccess?: () => void
}

export function CreateTrashForm({ onSuccess }: CreateTrashFormProps) {
  const { t } = useTranslation('trash')
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toast(t('form.contentRequired'), { type: 'error' })
      return
    }

    setLoading(true)
    try {
      const createData: CreateTrashDto = {
        content: content.trim(),
        media: imageUrls.filter(Boolean).map((imageUrl) => ({ imageUrl })),
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

  const addImage = () => {
    setImageUrls([...imageUrls, ''])
  }

  const updateImage = (index: number, value: string) => {
    const newImageUrls = [...imageUrls]
    newImageUrls[index] = value
    setImageUrls(newImageUrls)
  }

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          {t('form.publishButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('form.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="content">{t('form.content')} *</Label>
            <Textarea
              id="content"
              placeholder={t('form.contentPlaceholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t('form.images')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImage}
              >
                {t('form.addImage')}
              </Button>
            </div>
            {imageUrls.map((imageUrl, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <Input
                  placeholder={t('form.imagePlaceholder')}
                  value={imageUrl}
                  onChange={(e) => updateImage(index, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('form.publishing') : t('form.publish')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
