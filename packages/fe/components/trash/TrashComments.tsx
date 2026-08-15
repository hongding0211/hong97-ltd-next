import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLogin } from '@hooks/useLogin'
import { emitter } from '@utils/emitter'
import { useTranslation } from 'next-i18next'
import React, { useEffect, useState } from 'react'
import { CommentTrashForm } from './CommentTrashForm'

export interface TrashComment {
  commentId: string
  parentCommentId?: string
  replyToCommentId?: string
  replyToName?: string
  userId?: string
  anonymous: boolean
  name?: string
  time: number
  content: string
  deleted?: boolean
}

export type TrashCommentAction = 'delete'

interface TrashCommentsProps {
  comments: TrashComment[]
  isAdmin?: boolean
  onAction?: (commentId: string, action: TrashCommentAction) => void
  onReply?: (content: string, parentCommentId: string) => Promise<boolean>
}

const TrashCommentItem: React.FC<
  TrashComment & {
    onDelete?: (commentId: string) => void
    onReply?: (commentId: string) => void
    isAdmin?: boolean
  }
> = (props) => {
  const {
    content,
    userId,
    name,
    onDelete,
    onReply,
    commentId,
    deleted,
    replyToName,
    isAdmin = false,
  } = props
  const [showDialog, setShowDialog] = useState(false)
  const [pressed, setPressed] = useState(false)
  const { user: currentUser } = useLogin()
  const { t } = useTranslation('trash')
  const { t: tCommon } = useTranslation('common')
  const showDelete =
    !deleted && (isAdmin || (!!userId && currentUser?.userId === userId))

  return (
    <>
      <div className="text-neutral-600 dark:text-neutral-400 text-sm">
        <button
          type="button"
          onClick={() => onReply?.(commentId)}
          onPointerDown={() => setPressed(true)}
          onPointerUp={() => setPressed(false)}
          onPointerCancel={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          className={`-mx-1 inline-block touch-manipulation rounded px-1 text-left align-baseline transition-all duration-100 ease-out ${
            pressed
              ? 'scale-[0.98] bg-neutral-300/70 opacity-70 dark:bg-neutral-700/80'
              : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80'
          }`}
        >
          {deleted ? (
            <span className="italic opacity-60">{t('comment.deleted')}</span>
          ) : (
            <>
              <span className="mr-1 font-medium">{name}</span>
              {replyToName && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  @{replyToName}：
                </span>
              )}
              <span className="text-neutral-500">{content}</span>
            </>
          )}
        </button>
        {showDelete && (
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            className="ml-2 opacity-60 hover:underline active:underline cursor-pointer text-xs"
          >
            {t('comment.delete.text')}
          </button>
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
  const { comments, isAdmin = false, onAction, onReply } = props
  const { t } = useTranslation('trash')
  const [showAll, setShowAll] = useState(false)
  const [replyingToId, setReplyingToId] = useState<string>()
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
    new Set(),
  )

  useEffect(() => {
    emitter.on('trashCommentSent', () => {
      setShowAll(true)
    })
  }, [])

  if (!comments.length) {
    return null
  }

  const rootIds = new Set(
    comments
      .filter((comment) => !comment.parentCommentId)
      .map((comment) => comment.commentId),
  )
  const rootComments = comments.filter(
    (comment) =>
      !comment.parentCommentId || !rootIds.has(comment.parentCommentId),
  )
  const repliesByRootId = new Map<string, TrashComment[]>()

  for (const comment of comments) {
    if (!comment.parentCommentId || !rootIds.has(comment.parentCommentId)) {
      continue
    }
    const replies = repliesByRootId.get(comment.parentCommentId) ?? []
    replies.push(comment)
    repliesByRootId.set(comment.parentCommentId, replies)
  }
  repliesByRootId.forEach((replies) => {
    replies.sort((left, right) => left.time - right.time)
  })

  const displayComments = showAll ? rootComments : rootComments.slice(0, 2)
  const hasMore = rootComments.length > 2

  const renderReplyForm = (commentId: string, rootCommentId: string) => {
    if (replyingToId !== commentId || !onReply) return null

    return (
      <CommentTrashForm
        onComment={async (content) => {
          const succeeded = await onReply(content, commentId)
          if (succeeded) {
            setReplyingToId(undefined)
            setExpandedThreadIds((current) => {
              const next = new Set(current)
              next.add(rootCommentId)
              return next
            })
          }
          return succeeded
        }}
      />
    )
  }

  return (
    <div className="mt-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-md p-2.5">
      <div className="flex flex-col space-y-2.5">
        {displayComments.map((comment) => {
          const replies = repliesByRootId.get(comment.commentId) ?? []
          const threadExpanded = expandedThreadIds.has(comment.commentId)
          const displayReplies = threadExpanded ? replies : replies.slice(0, 2)
          const hasMoreReplies = replies.length > 2

          return (
            <div key={comment.commentId} className="text-sm">
              <TrashCommentItem
                {...comment}
                isAdmin={isAdmin}
                onReply={(commentId) =>
                  setReplyingToId((current) =>
                    current === commentId ? undefined : commentId,
                  )
                }
                onDelete={() => onAction?.(comment.commentId, 'delete')}
              />
              {renderReplyForm(comment.commentId, comment.commentId)}

              {displayReplies.length > 0 && (
                <div className="mt-2 ml-3 border-l border-neutral-200 pl-3 dark:border-neutral-700 space-y-2.5">
                  {displayReplies.map((reply) => (
                    <div key={reply.commentId}>
                      <TrashCommentItem
                        {...reply}
                        isAdmin={isAdmin}
                        onReply={(commentId) =>
                          setReplyingToId((current) =>
                            current === commentId ? undefined : commentId,
                          )
                        }
                        onDelete={() => onAction?.(reply.commentId, 'delete')}
                      />
                      {renderReplyForm(reply.commentId, comment.commentId)}
                    </div>
                  ))}
                </div>
              )}

              {hasMoreReplies && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedThreadIds((current) => {
                      const next = new Set(current)
                      if (threadExpanded) {
                        next.delete(comment.commentId)
                      } else {
                        next.add(comment.commentId)
                      }
                      return next
                    })
                  }
                  className="mt-2 ml-3 text-xs text-neutral-500 transition-colors hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  {threadExpanded
                    ? t('comment.collapseReplies')
                    : t('comment.expandReplies', {
                        count: replies.length - 2,
                      })}
                </button>
              )}
            </div>
          )
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors self-start"
          >
            {showAll
              ? t('comment.collapse')
              : t('comment.expand', { count: rootComments.length - 2 })}
          </button>
        )}
      </div>
    </div>
  )
}
