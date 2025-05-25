import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { Forward, Loader } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

interface CommentEditProps {
  blogId: string
  onSubmit?: () => void
}

export const CommentEdit: React.FC<CommentEditProps> = (props) => {
  const { blogId, onSubmit } = props

  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const { t } = useTranslation('blog')

  const handleSubmit = () => {
    const trimContent = content.trim()
    if (!trimContent.length) {
      toast(t('emptyComment'))
      return
    }
    if (trimContent.length > 500) {
      toast(t('commentTooLong'))
      return
    }

    setLoading(true)
    http
      .post('PostBlogComment', {
        blogId,
        content: trimContent,
        anonymous: false,
      })
      .then((res) => {
        if (res.isSuccess) {
          toast(t('sendCommentSuccess'), {
            type: 'success',
          })
        } else {
          toast(res.msg, {
            type: 'error',
          })
        }
        setContent('')
      })
      .finally(() => {
        setLoading(false)
        onSubmit?.()
      })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[120px] md:h-[150px]">
        <Textarea
          placeholder={t('typeComment')}
          className="text-sm resize-none absolute top-0 left-0 w-full h-full text-neutral-600 dark:text-neutral-400"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="absolute bottom-2.5 right-2.5 text-xs text-neutral-500">
          {content.length} / 500
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? (
          <Loader className="w-4 h-4 animate-spin" />
        ) : (
          <Forward className="w-4 h-4" />
        )}
        {t('sendComment')}
      </Button>
    </div>
  )
}
