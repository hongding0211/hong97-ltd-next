import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLogin } from '@hooks/useLogin'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

export interface TrashComment {
  commentId: string
  userId?: string
  anonymous: boolean
  name?: string
  time: number
  content: string
}

export type TrashCommentAction = 'delete'

interface TrashCommentsProps {
  comments: TrashComment[]
  onAction?: (commentId: string, action: TrashCommentAction) => void
}

const TrashComment: React.FC<
  TrashComment & {
    onDelete?: (commentId: string) => void
  }
> = (props) => {
  const { content, userId, name, onDelete, commentId } = props

  const [showDialog, setShowDialog] = useState(false)

  const { user: currentUser } = useLogin()

  const { t } = useTranslation('trash')
  const { t: tCommon } = useTranslation('common')

  const showDelete = userId && currentUser?.userId === userId

  return (
    <>
      <div className="text-neutral-600 dark:text-neutral-400 text-sm">
        <span className="font-medium">{name}：</span>
        <span className="text-neutral-500">{content}</span>
        {showDelete && (
          <span
            onClick={() => setShowDialog(true)}
            className="ml-2 opacity-60 hover:underline active:underline cursor-pointer text-xs"
          >
            {t('comment.delete.text')}
          </span>
        )}
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-md !w-[90%] max-w-[350px] py-4 pt-5 px-4">
          <DialogHeader>
            <DialogTitle className="!text-left">
              {t('comment.delete.text')}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t('comment.delete.confirmTitle')}
          </DialogDescription>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              onClick={() => setShowDialog(false)}
              size="sm"
              variant="ghost"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setShowDialog(false)
                onDelete?.(commentId)
              }}
            >
              {t('comment.delete.text')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const TrashComments: React.FC<TrashCommentsProps> = (props) => {
  const { comments, onAction } = props
  const { t } = useTranslation('trash')
  const [showAll, setShowAll] = useState(false)

  if (!comments.length) {
    return null
  }

  const displayComments = showAll ? comments : comments.slice(0, 2)
  const hasMore = comments.length > 2

  return (
    <div className="mt-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-md p-2.5">
      <div className="flex flex-col space-y-2.5">
        {displayComments.map((c) => (
          <div key={c.commentId} className="text-sm">
            <TrashComment
              {...c}
              onDelete={() => onAction?.(c.commentId, 'delete')}
            />
          </div>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors self-start"
          >
            {showAll
              ? t('comment.collapse')
              : t('comment.expand', { count: comments.length - 2 })}
          </button>
        )}
      </div>
    </div>
  )
}
