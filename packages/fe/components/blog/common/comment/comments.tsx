import Avatar from '@components/common/Avatar'
import { CommentsResponseDto } from '@server/modules/blog/dto/comment.dto'
import { useTranslation } from 'next-i18next'
import React from 'react'

interface CommentsProps {
  comments: CommentsResponseDto['comments']
}

const Comment: React.FC<CommentsResponseDto['comments'][0]> = (props) => {
  const { content, user, name } = props

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
    </div>
  )
}

export const Comments: React.FC<CommentsProps> = (props) => {
  const { comments } = props

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
            <Comment {...c} />
            {i !== comments.length - 1 && (
              <div className="my-4 h-[1px] w-full bg-neutral-200 dark:bg-neutral-800" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
