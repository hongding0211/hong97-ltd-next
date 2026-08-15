import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { Loader } from 'lucide-react'
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
        {content.length > 500 && (
          <div className="absolute bottom-2.5 right-2.5 text-xs font-medium text-red-500">
            {content.length}
          </div>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={loading}>
        {loading && <Loader className="w-4 h-4 animate-spin" />}
        {t('sendComment')}
      </Button>
    </div>
  )
}

interface BlogReplyEditProps {
  blogId: string
  parentCommentId: string
  onSubmit?: () => void
}

export const BlogReplyEdit: React.FC<BlogReplyEditProps> = ({
  blogId,
  parentCommentId,
  onSubmit,
}) => {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation('blog')
  const trimmedContent = content.trim()
  const isTooLong = trimmedContent.length > 500

  const handleSubmit = async () => {
    if (!trimmedContent || isTooLong || loading) return

    setLoading(true)
    try {
      const res = await http.post('PostBlogComment', {
        blogId,
        content: trimmedContent,
        parentCommentId,
        anonymous: false,
      })

      if (!res.isSuccess) {
        toast(res.msg, { type: 'error' })
        return
      }

      setContent('')
      toast(t('sendCommentSuccess'), { type: 'success' })
      onSubmit?.()
    } catch (_error) {
      // The shared HTTP client already presents request errors.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative mt-3">
      <Textarea
        autoFocus
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={2}
        disabled={loading}
        className="resize-none pr-24 text-sm"
      />
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        {isTooLong && (
          <span className="text-xs font-medium text-red-500">
            {trimmedContent.length}
          </span>
        )}
        <button
          type="button"
          className="text-xs font-semibold text-neutral-600 transition-opacity hover:text-neutral-900 active:opacity-50 disabled:cursor-default disabled:opacity-40 dark:text-neutral-300 dark:hover:text-neutral-50"
          onClick={handleSubmit}
          disabled={loading || !trimmedContent || isTooLong}
        >
          {loading ? t('reply.sending') : t('reply.send')}
        </button>
      </div>
    </div>
  )
}
