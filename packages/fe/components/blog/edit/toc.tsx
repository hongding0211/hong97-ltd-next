import { cn } from '@/lib/utils'
import type { BlogTocItem } from '@utils/blog-toc'
import { TableOfContents, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { BlogToc } from '../BlogToc'

interface EditTocProps {
  items: BlogTocItem[]
  blogTitle: string
}

const EditToc: React.FC<EditTocProps> = ({ items, blogTitle }) => {
  const firstItemId = items[0]?.id
  const [activeId, setActiveId] = useState(firstItemId)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)
  const scrollSpyLockRef = useRef<string | null>(null)
  const scrollSpyUnlockTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setActiveId(firstItemId)
  }, [firstItemId])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 799px)')

    const updateViewport = () => {
      setIsNarrowViewport(mediaQuery.matches)

      if (!mediaQuery.matches) {
        setIsMobileOpen(false)
      }
    }

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  useEffect(() => {
    const updateActiveHeading = () => {
      const headings = items
        .map((item) => document.getElementById(item.id))
        .filter((heading): heading is HTMLElement => !!heading)

      if (!headings.length) {
        return
      }

      if (scrollSpyLockRef.current) {
        const lockedHeading = document.getElementById(scrollSpyLockRef.current)
        const lockedTop = lockedHeading?.getBoundingClientRect().top

        if (lockedTop === undefined || Math.abs(lockedTop - 150) > 8) {
          return
        }

        scrollSpyLockRef.current = null
      }

      let nextActiveId = headings[0].id

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 180) {
          nextActiveId = heading.id
        } else {
          break
        }
      }

      setActiveId((currentId) =>
        currentId === nextActiveId ? currentId : nextActiveId,
      )
    }

    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, { passive: true })
    window.addEventListener('resize', updateActiveHeading)

    return () => {
      window.removeEventListener('scroll', updateActiveHeading)
      window.removeEventListener('resize', updateActiveHeading)
      window.clearTimeout(scrollSpyUnlockTimerRef.current)
    }
  }, [items])

  useEffect(() => {
    if (!isMobileOpen) {
      return
    }

    const originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalBodyOverflow
    }
  }, [isMobileOpen])

  const scrollToHeading = (id: string) => {
    const heading = document.getElementById(id)

    if (!heading) {
      return
    }

    const top = heading.getBoundingClientRect().top + window.scrollY - 150

    setActiveId(id)
    scrollSpyLockRef.current = id
    window.clearTimeout(scrollSpyUnlockTimerRef.current)
    scrollSpyUnlockTimerRef.current = window.setTimeout(() => {
      scrollSpyLockRef.current = null
    }, 900)

    window.scrollTo({ top, behavior: 'smooth' })
  }

  const scrollToTitle = () => {
    setIsMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <aside className="blog-reading-toc hidden pt-[7rem] min-[800px]:block">
        <div className="sticky top-[8.5rem]">
          <BlogToc
            items={items}
            activeId={activeId}
            onSelect={scrollToHeading}
          />
        </div>
      </aside>

      {isNarrowViewport && (
        <div
          aria-hidden={!isMobileOpen}
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200 ease-out',
            isMobileOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="fixed inset-x-0 bottom-0 overflow-visible"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-x-0 -top-24 bottom-0',
                'bg-white/85 backdrop-blur-xl backdrop-saturate-50 dark:bg-neutral-950/85',
                '[mask-image:linear-gradient(to_bottom,transparent_0,black_96px,black_100%)]',
              )}
            />
            <div
              className={cn(
                'relative flex max-h-[75dvh] w-full flex-col items-start overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-5',
                'transition-all duration-300 ease-out',
                isMobileOpen
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-2 opacity-0',
              )}
            >
              <button
                type="button"
                onClick={scrollToTitle}
                className="mb-4 max-w-full truncate text-left text-xs font-medium uppercase leading-5 text-neutral-500 dark:text-neutral-400"
              >
                {blogTitle}
              </button>
              <ol className="w-full space-y-1.5">
                {items.map((item) => {
                  const active = (activeId || items[0]?.id) === item.id

                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(event) => {
                          event.preventDefault()
                          setIsMobileOpen(false)
                          scrollToHeading(item.id)
                        }}
                        className={cn(
                          'block truncate py-1 text-left text-[15px] leading-6 text-neutral-500 transition-colors dark:text-neutral-400',
                          item.level === 2 && 'pl-4',
                          active &&
                            'font-medium text-neutral-900 dark:text-neutral-50',
                        )}
                      >
                        {item.title}
                      </a>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      )}

      {isNarrowViewport && (
        <button
          type="button"
          aria-label={isMobileOpen ? '关闭文章目录' : '打开文章目录'}
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen((open) => !open)}
          className={cn(
            'fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 z-50',
            'flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300/90',
            'bg-white/70 text-neutral-800 backdrop-blur transition active:scale-95',
            'dark:border-neutral-700/90 dark:bg-neutral-950/70 dark:text-neutral-100',
          )}
        >
          <TableOfContents
            className={cn(
              'absolute h-[18px] w-[18px] transition-all duration-200 ease-out',
              isMobileOpen
                ? 'rotate-90 scale-75 opacity-0'
                : 'rotate-0 scale-100 opacity-100',
            )}
            strokeWidth={1.8}
          />
          <X
            className={cn(
              'absolute h-[18px] w-[18px] transition-all duration-200 ease-out',
              isMobileOpen
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-75 opacity-0',
            )}
            strokeWidth={1.8}
          />
        </button>
      )}
    </>
  )
}

export default EditToc
