import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Avatar from '@components/common/Avatar'
import { useLogin } from '@hooks/useLogin'
import { CommentsResponseDto } from '@server/modules/blog/dto/comment.dto'
import { time as timeUtil } from '@utils/time'
import { useTranslation } from 'next-i18next'
import React from 'react'

export type CommentAction = 'delete'

interface CommentsProps {
  comments: CommentsResponseDto['comments']
  onAction?: (commentId: string, action: CommentAction) => void
}

const Comment: React.FC<
  CommentsResponseDto['comments'][0] & {
    onDelete?: (commentId: string) => void
  }
> = (props) => {
  const { content, user, name, time, onDelete, commentId } = props

  const { user: currentUser } = useLogin()

  const { t } = useTranslation('blog')
  const { t: tCommon } = useTranslation('common')

  const showDelete = currentUser?.userId === user.userId && user.userId

  return (
    <div className="flex flex-col gap-1.5 text-neutral-600 dark:text-neutral-400">
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
      <div>{content}</div>
      <div className="flex items-center gap-2 text-xs">
        <div className="relative opacity-80 font-medium">
          {timeUtil.formatDynamic(time)}
        </div>
        {showDelete && (
          <Dialog>
            <DialogTrigger asChild>
              <div className="opacity-70 hover:underline active:underline cursor-pointer">
                {t('deleteComment.text')}
              </div>
            </DialogTrigger>
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
                <DialogClose asChild>
                  <Button size="sm" variant="ghost">
                    {tCommon('cancel')}
                  </Button>
                </DialogClose>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete?.(commentId)}
                >
                  {t('deleteComment.text')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

export const Comments: React.FC<CommentsProps> = (props) => {
  const { comments, onAction } = props

  const { t } = useTranslation('blog')

  if (!comments.length) {
    return null
  }

  return (
    <div className="px-3 py-1.5 pb-3 rounded-md bg-neutral-100 dark:bg-neutral-900 mt-10">
      <div className="text-sm mt-2 mb-6 font-semibold">{`${t('allComments')}(${
        comments.length
      })`}</div>
      <div className="flex flex-col">
        {comments.map((c, i) => (
          <div key={c.commentId}>
            <Comment
              {...c}
              onDelete={() => onAction?.(c.commentId, 'delete')}
            />
            {i !== comments.length - 1 && (
              <div className="my-4 h-[1px] w-full bg-neutral-200 dark:bg-neutral-800" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
