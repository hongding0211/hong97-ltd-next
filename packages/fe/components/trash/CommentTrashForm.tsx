import { Textarea } from '@/components/ui/textarea'
import { useLogin } from '@hooks/useLogin'
import { emitter } from '@utils/emitter'
import { Send } from 'lucide-react'
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
        className="text-sm resize-none"
      />
      <div
        className="flex justify-end absolute bottom-3.5 right-3.5 text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors cursor-pointer"
        onClick={handleSubmit}
      >
        <Send className="w-3.5 h-3.5" />
      </div>
    </div>
  )
}
