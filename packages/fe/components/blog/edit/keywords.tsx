import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useState } from 'react'

interface TagProps {
  children: React.ReactNode
  onRemove?: () => void
  variant?: 'default' | 'add'
  className?: string
  onClick?: () => void
}

const Tag: React.FC<TagProps> = ({
  children,
  onRemove,
  variant = 'default',
  className,
  onClick,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs transition-colors',
        variant === 'default' &&
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700',
        variant === 'add' &&
          'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer border border-dashed border-neutral-300 dark:border-neutral-600',
        className,
      )}
      onClick={onClick}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-full p-0.5 transition-colors"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

interface IKeywords {
  keywords: string[]
  onKeywordsChange?: (keywords: string[]) => void
}

const Keywords: React.FC<IKeywords> = (props) => {
  const { keywords, onKeywordsChange } = props

  const [dialogOpen, setDialogOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const { t } = useTranslation('blog')

  const handleAddKeyword = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && !keywords.includes(trimmedValue)) {
      onKeywordsChange?.([...keywords, trimmedValue])
    }
    setInputValue('')
    setDialogOpen(false)
  }

  const handleRemoveKeyword = (keyword: string) => {
    onKeywordsChange?.(keywords.filter((k) => k !== keyword))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {keywords.map((keyword) => (
          <Tag key={keyword} onRemove={() => handleRemoveKeyword(keyword)}>
            {keyword}
          </Tag>
        ))}
        <Tag variant="add" onClick={() => setDialogOpen(true)}>
          {t('edit.addKeyword')}
        </Tag>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit.addKeywordDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('edit.addKeywordDialog.placeholder')}
              spellCheck="false"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setInputValue('')
                setDialogOpen(false)
              }}
            >
              {t('edit.addKeywordDialog.cancel')}
            </Button>
            <Button onClick={handleAddKeyword} disabled={!inputValue.trim()}>
              {t('edit.addKeywordDialog.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Keywords
