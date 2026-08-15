import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Avatar from '@components/common/Avatar'
import { useUser } from '@hooks/useUser'
import { CommentsResponseDto } from '@server/modules/blog/dto/comment.dto'
import { time as timeUtil } from '@utils/time'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'
import { BlogReplyEdit } from './edit'

export type CommentAction = 'delete'

interface CommentsProps {
  blogId: string
  comments: CommentsResponseDto['comments']
  onAction?: (commentId: string, action: CommentAction) => void
  onCommentSubmit?: () => void
}

type BlogComment = CommentsResponseDto['comments'][0]

const Comment: React.FC<
  BlogComment & {
    isReply?: boolean
    onDelete?: (commentId: string) => void
    onReply?: (commentId: string) => void
  }
> = (props) => {
  const {
    content,
    user,
    name,
    time,
    onDelete,
    onReply,
    commentId,
    deleted,
    replyToName,
    isReply = false,
  } = props
  const [showDialog, setShowDialog] = useState(false)
  const [pressed, setPressed] = useState(false)
  const currentUser = useUser()
  const { t } = useTranslation('blog')
  const { t: tCommon } = useTranslation('common')
  const showDelete =
    !deleted &&
    ((user?.userId && currentUser?.userId === user.userId) ||
      currentUser?.isAdmin)
  const commentContent = deleted ? (
    <span className="italic opacity-60">{t('reply.deleted')}</span>
  ) : (
    <>
      {replyToName && (
        <span className="text-neutral-400 dark:text-neutral-500">
          @{replyToName}：
        </span>
      )}
      <span>{content}</span>
    </>
  )

  return (
    <>
      <div className="flex flex-col gap-1.5 text-neutral-600 dark:text-neutral-400">
        {!deleted && (
          <div className="flex items-center gap-1.5">
            <Avatar
              user={{
                ...user,
                profile: {
                  ...user?.profile,
                  name,
                },
              }}
              width={18}
              borderWidth={1}
            />
            <div className="text-sm">{name}</div>
          </div>
        )}
        {isReply ? (
          <button
            type="button"
            onClick={() => onReply?.(commentId)}
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => setPressed(false)}
            onPointerCancel={() => setPressed(false)}
            onPointerLeave={() => setPressed(false)}
            className={`-mx-1 inline-block max-w-full touch-manipulation self-start rounded px-1 text-left transition-all duration-100 ease-out ${
              pressed
                ? 'scale-[0.98] bg-neutral-300/70 opacity-70 dark:bg-neutral-700/80'
                : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800/80'
            }`}
          >
            {commentContent}
          </button>
        ) : (
          <div>{commentContent}</div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <div className="relative opacity-80 font-medium">
            {timeUtil.formatDynamic(time)}
          </div>
          {!isReply && (
            <button
              type="button"
              onClick={() => onReply?.(commentId)}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerCancel={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              className={`cursor-pointer hover:underline ${
                pressed ? 'opacity-40 underline' : 'opacity-70'
              }`}
            >
              {t('reply.text')}
            </button>
          )}
          {showDelete && (
            <button
              type="button"
              onClick={() => setShowDialog(true)}
              className="cursor-pointer opacity-70 hover:underline active:underline"
            >
              {t('deleteComment.text')}
            </button>
          )}
        </div>
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-md !w-[90%] max-w-[350px] py-4 pt-5 px-4">
          <DialogHeader>
            <DialogTitle className="!text-left">
              {t('deleteComment.text')}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t('deleteComment.confirmTitle')}
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
              {t('deleteComment.text')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const Comments: React.FC<CommentsProps> = (props) => {
  const { blogId, comments, onAction, onCommentSubmit } = props
  const { t } = useTranslation('blog')
  const [replyingToId, setReplyingToId] = useState<string>()
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
    new Set(),
  )

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
  const repliesByRootId = new Map<string, BlogComment[]>()

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

  const renderReplyForm = (commentId: string, rootCommentId: string) => {
    if (replyingToId !== commentId) return null

    return (
      <BlogReplyEdit
        blogId={blogId}
        parentCommentId={commentId}
        onSubmit={() => {
          setReplyingToId(undefined)
          setExpandedThreadIds((current) => {
            const next = new Set(current)
            next.add(rootCommentId)
            return next
          })
          onCommentSubmit?.()
        }}
      />
    )
  }

  return (
    <div className="px-3 py-1.5 pb-3 rounded-md bg-neutral-100 dark:bg-neutral-900 mt-10">
      <div className="text-sm mt-2 mb-6 font-semibold">
        {t('allComments', { count: comments.length })}
      </div>
      <div className="flex flex-col">
        {rootComments.map((comment, index) => {
          const replies = repliesByRootId.get(comment.commentId) ?? []
          const threadExpanded = expandedThreadIds.has(comment.commentId)
          const displayReplies = threadExpanded ? replies : replies.slice(0, 2)
          const hasMoreReplies = replies.length > 2

          return (
            <div key={comment.commentId}>
              <Comment
                {...comment}
                onReply={(commentId) =>
                  setReplyingToId((current) =>
                    current === commentId ? undefined : commentId,
                  )
                }
                onDelete={() => onAction?.(comment.commentId, 'delete')}
              />
              {renderReplyForm(comment.commentId, comment.commentId)}

              {displayReplies.length > 0 && (
                <div className="mt-4 ml-3 space-y-4 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                  {displayReplies.map((reply) => (
                    <div key={reply.commentId}>
                      <Comment
                        {...reply}
                        isReply
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
                  className="mt-3 ml-3 text-xs text-neutral-500 transition-colors hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  {threadExpanded
                    ? t('reply.collapse')
                    : t('reply.expand', { count: replies.length - 2 })}
                </button>
              )}

              {index !== rootComments.length - 1 && (
                <div className="my-4 h-[1px] w-full bg-neutral-200 dark:bg-neutral-800" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
