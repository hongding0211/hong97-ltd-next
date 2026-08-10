import { Textarea } from '@/components/ui/textarea'
import { useLogin } from '@hooks/useLogin'
import { emitter } from '@utils/emitter'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

interface CommentTrashFormProps {
  trashId: string
  onComment: (content: string) => Promise<void>
  disabled?: boolean
  onCommentSuccess?: () => void
}

export const CommentTrashForm: React.FC<CommentTrashFormProps> = ({
  onComment,
  disabled,
  onCommentSuccess,
}) => {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const { isLogin } = useLogin()
  const { t } = useTranslation('trash')

  const handleSubmit = async () => {
    if (!content.trim() || loading) return

    setLoading(true)
    try {
      await onComment(content.trim())
      setContent('')
      onCommentSuccess?.()
      emitter.emit('trashCommentSent')
    } catch (_error) {
      // noop
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 relative">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          isLogin ? t('comment.placeholder') : t('comment.anonymousPlaceholder')
        }
        rows={2}
        disabled={disabled || loading}
        className="text-sm resize-none pr-20"
      />
      <button
        type="button"
        className="absolute bottom-3 right-3 text-xs font-semibold text-neutral-600 transition-opacity hover:text-neutral-900 active:opacity-50 disabled:cursor-default disabled:opacity-40 dark:text-neutral-300 dark:hover:text-neutral-50"
        onClick={handleSubmit}
        disabled={disabled || loading || !content.trim()}
      >
        {loading ? t('comment.publishing') : t('comment.publish')}
      </button>
    </div>
  )
}
