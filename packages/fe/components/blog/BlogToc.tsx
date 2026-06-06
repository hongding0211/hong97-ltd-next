import { cn } from '@/lib/utils'
import type { BlogTocItem } from '@utils/blog-toc'

interface BlogTocProps {
  items: BlogTocItem[]
  activeId?: string
  blogTitle?: string
  showBlogTitle?: boolean
  onTitleSelect?: () => void
  onSelect?: (id: string) => void
}

export function BlogToc({
  items,
  activeId,
  blogTitle,
  showBlogTitle,
  onTitleSelect,
  onSelect,
}: BlogTocProps) {
  if (!items.length) {
    return null
  }

  return (
    <nav aria-label="文章目录" className="w-full">
      <div
        aria-hidden={!showBlogTitle}
        className={cn(
          'overflow-hidden transition-all duration-200',
          showBlogTitle ? 'mb-4 max-h-12 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <button
          type="button"
          onClick={onTitleSelect}
          className="block w-full truncate text-left text-[13px] font-medium uppercase leading-5 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
        >
          {blogTitle}
        </button>
      </div>
      <ol className="space-y-1">
        {items.map((item) => {
          const active = (activeId || items[0]?.id) === item.id

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault()
                  onSelect?.(item.id)
                }}
                className={cn(
                  'block rounded-sm py-1.5 text-sm leading-5 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300',
                  item.level === 2 && 'pl-2.5',
                  active &&
                    'font-medium text-neutral-700 dark:text-neutral-300',
                )}
              >
                <span className="block truncate">{item.title}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
