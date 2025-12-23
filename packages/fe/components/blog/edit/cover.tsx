import { GridPattern } from '@/components/ui/grid-pattern'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Loader2, Pencil, Trash } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React from 'react'
import { ActionLoading, BlogMeta } from './common'

interface ICover {
  meta: BlogMeta
  coverImg?: string
  loading: ActionLoading
  onAddCover?: () => void
  onRemoveCover?: () => void
}

const Cover: React.FC<ICover> = (props) => {
  const { meta, coverImg, onAddCover, onRemoveCover, loading } = props

  const { t } = useTranslation('blog')

  if (!meta?.coverImg && !coverImg) {
    return (
      <div className="bg-background relative flex flex-col items-center justify-center overflow-hidden rounded-lg w-dvw mx-[-1.25rem] aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] mb-8 md:mb-12 lg:mb-16">
        <GridPattern
          squares={[
            [4, 4],
            [5, 1],
            [8, 2],
            [5, 3],
            [5, 5],
            [10, 10],
            [12, 15],
            [15, 10],
            [10, 15],
            [15, 10],
            [10, 15],
            [15, 10],
          ]}
          className={cn(
            '[mask-image:linear-gradient(to_bottom,white_0%,white_80%,transparent_100%)]',
            'inset-x-0 inset-y-0 h-full',
          )}
        />
        <div
          onClick={onAddCover}
          className="bg-neutral-200/70 cursor-pointer dark:bg-neutral-800/70 backdrop-blur-xl px-2 py-1.5 rounded-full flex items-center gap-x-1 absolute left-3 bottom-3 sm:left-6 sm:bottom-4"
        >
          {loading === 'coverChange' ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Pencil className="w-2.5 h-2.5" />
          )}
          <span className="text-xs">{t('edit.addCover')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-dvw mx-[-1.25rem] aspect-[2/1] md:aspect-[3/1] lg:aspect-[4/1] mb-8 md:mb-12 lg:mb-16">
      <Skeleton className="w-full h-full absolute rounded-sm sm:rounded-none" />
      {/* biome-ignore lint/a11y/useAltText: <explanation> */}
      <img
        src={coverImg ?? meta.coverImg}
        className="w-full h-full object-cover rounded-sm sm:rounded-none absolute top-0 left-0"
      />

      <div className="flex items-center gap-x-1 sm:gap-x-2 absolute left-3 bottom-3 sm:left-6 sm:bottom-4">
        <div
          onClick={onAddCover}
          className="bg-neutral-200/70 cursor-pointer dark:bg-neutral-800/70 backdrop-blur backdrop-saturate-150 px-2 py-1.5 rounded-full flex items-center gap-x-1"
        >
          {loading === 'coverChange' ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Pencil className="w-2.5 h-2.5" />
          )}
          <span className="text-xs">{t('edit.changeCover')}</span>
        </div>

        <div
          onClick={onRemoveCover}
          className="bg-neutral-200/70 cursor-pointer dark:bg-neutral-800/70 backdrop-blur backdrop-saturate-150 px-2 py-1.5 rounded-full flex items-center gap-x-1"
        >
          {loading === 'coverRemove' ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Trash className="w-2.5 h-2.5" />
          )}
          <span className="text-xs">{t('edit.removeCover')}</span>
        </div>
      </div>
    </div>
  )
}

export default Cover
