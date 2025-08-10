import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useImagePreview } from '@hooks/useImagePreview'
import { useLogin } from '@hooks/useLogin'
import { http } from '@services/http'
import { TrashResponseDto } from '@services/trash/types'
import { getCompressImage } from '@utils/oss'
import { time } from '@utils/time'
import { toast } from '@utils/toast'
import { Heart } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { useEffect, useRef, useState } from 'react'
import { CommentTrashForm } from './CommentTrashForm'
import { TrashCommentAction, TrashComments } from './TrashComments'

interface TrashItemProps {
  item: TrashResponseDto
  onDelete?: (itemId: string) => void
  onLikeUpdate?: (itemId: string, newItem: TrashResponseDto) => void
  onCommentUpdate?: (itemId: string, newItem: TrashResponseDto) => void
  isAdmin?: boolean
}

// 图片骨架屏组件
const ImageSkeleton = () => (
  <div className="w-full h-full bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-md absolute" />
)

// 带骨架屏的图片组件
const ImageWithSkeleton: React.FC<{
  src: string
  alt: string
  className?: string
  onClick?: () => void
}> = ({ src, alt, className, onClick }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  return (
    <div
      className={`aspect-square relative ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      }`}
      onClick={onClick}
    >
      {loading && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        className={`${className} ${
          loading ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-200`}
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
      />
      {error && !loading && (
        <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700 rounded-md flex items-center justify-center">
          <span className="text-neutral-500 text-xs">Failed to load</span>
        </div>
      )}
    </div>
  )
}

export function TrashItem({
  item,
  onDelete,
  onLikeUpdate,
  onCommentUpdate,
  isAdmin = false,
}: TrashItemProps) {
  const { t, i18n } = useTranslation('trash')
  const { t: tCommon } = useTranslation('common')
  const { isLogin } = useLogin()
  const imagePreview = useImagePreview()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likeCount)
  const [isLiked, setIsLiked] = useState(item.isLiked)
  const [comments, setComments] = useState(item.comments)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const loading = useRef(false)

  // 设置时间工具的语言
  useEffect(() => {
    time.setLocale(i18n.language)
  }, [i18n.language])

  // 当 item 的状态更新时，同步本地状态
  useEffect(() => {
    setLikeCount(item.likeCount)
    setIsLiked(item.isLiked)
    setComments(item.comments)
  }, [item.likeCount, item.isLiked, item.comments])

  const handleImageClick = (index: number) => {
    if (!item.media || item.media.length === 0) return

    const previewImages = item.media.map((media) => ({
      img: media.imageUrl,
    }))

    imagePreview.show(previewImages, index)
  }

  const handleLike = async () => {
    if (loading.current) return
    if (isLiked && !isLogin) return // 匿名用户不能取消点赞

    loading.current = true
    const newLikeCount = likeCount + (isLiked ? -1 : 1)
    const newIsLiked = !isLiked

    // 乐观更新 UI
    setLikeCount(newLikeCount)
    setIsLiked(newIsLiked)

    try {
      const response = await http.post('PostLikeTrash', {
        trashId: item._id,
      })

      if (response.isSuccess) {
        // 对于已登录用户，使用服务端返回的 isLiked 状态
        // 对于匿名用户，保持乐观更新的状态（因为服务端无法跟踪匿名用户的点赞状态）
        const finalLikeCount = response.data.likeCount
        const finalIsLiked = isLogin ? response.data.isLiked : newIsLiked

        setLikeCount(finalLikeCount)
        setIsLiked(finalIsLiked)
        onLikeUpdate?.(item._id, { ...response.data, isLiked: finalIsLiked })
      } else {
        // 恢复之前的状态
        setLikeCount(likeCount)
        setIsLiked(isLiked)
        toast(response.msg || '点赞失败', { type: 'error' })
      }
    } catch (error) {
      console.error('Like error:', error)
      // 恢复之前的状态
      setLikeCount(likeCount)
      setIsLiked(isLiked)
      toast('点赞失败', { type: 'error' })
    } finally {
      loading.current = false
    }
  }

  const handleComment = async (content: string) => {
    try {
      const response = await http.post('PostCommentTrash', {
        trashId: item._id,
        content,
        anonymous: !isLogin,
      })

      if (response.isSuccess) {
        setComments(response.data.comments)
        onCommentUpdate?.(item._id, response.data)
        toast(t('comment.success'), { type: 'success' })
      } else {
        toast(response.msg || t('comment.failed'), { type: 'error' })
      }
    } catch (error) {
      console.error('Comment error:', error)
      toast(t('comment.failed'), { type: 'error' })
    }
  }

  const handleCommentAction = async (
    commentId: string,
    action: TrashCommentAction,
  ) => {
    if (action === 'delete') {
      try {
        const response = await http.delete('DeleteCommentTrash', {
          trashId: item._id,
          commentId,
        })

        if (response.isSuccess) {
          setComments(response.data.comments)
          onCommentUpdate?.(item._id, response.data)
          toast(t('comment.delete.success'), { type: 'success' })
        } else {
          toast(response.msg || t('comment.delete.failed'), { type: 'error' })
        }
      } catch (error) {
        console.error('Delete comment error:', error)
        toast(t('comment.delete.failed'), { type: 'error' })
      }
    }
  }

  return (
    <div className="py-4 border-b border-neutral-100 dark:border-neutral-950">
      <div className="space-y-2">
        {/* 内容 */}
        {item.content && (
          <div className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
            {item.content}
          </div>
        )}

        {/* 图片 */}
        {item.media && item.media.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 gap-x-1.5 mr-12">
            {item.media.map((media, index) => (
              <ImageWithSkeleton
                key={index}
                src={getCompressImage(media.imageUrl, 180)}
                alt={`Media ${index + 1}`}
                className="w-full h-full object-cover rounded-md bg-neutral-100 dark:bg-neutral-800"
                onClick={() => handleImageClick(index)}
              />
            ))}
          </div>
        )}

        {/* 标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 时间和操作 */}
        <div className="flex items-center gap-2 text-sm">
          <div className="relative opacity-80 text-neutral-500 dark:text-neutral-400">
            {time.formatDynamic(item.timestamp)}
          </div>
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1 text-neutral-400 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
            disabled={loading.current}
          >
            {isLiked ? (
              <Heart className="w-3.5 h-3.5" fill="red" stroke="none" />
            ) : (
              <Heart className="w-3.5 h-3.5" />
            )}
            {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="opacity-70 hover:underline active:underline cursor-pointer text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            {t('comment.text')}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="opacity-70 hover:underline active:underline cursor-pointer text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              {t('delete.text')}
            </button>
          )}
        </div>

        {/* 评论表单 */}
        {showCommentForm && (
          <CommentTrashForm
            trashId={item._id}
            onComment={handleComment}
            onCommentSuccess={() => setShowCommentForm(false)}
          />
        )}

        {/* 评论区域 */}
        <TrashComments comments={comments} onAction={handleCommentAction} />
      </div>

      {/* 图片预览组件 */}
      {imagePreview.component}

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-md !w-[90%] max-w-[350px] py-4 pt-5 px-4">
          <DialogHeader>
            <DialogTitle className="!text-left">{t('delete.text')}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t('delete.confirmTitle')}</DialogDescription>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              onClick={() => setShowDeleteDialog(false)}
              size="sm"
              variant="ghost"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setShowDeleteDialog(false)
                onDelete?.(item._id)
              }}
            >
              {t('delete.text')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
