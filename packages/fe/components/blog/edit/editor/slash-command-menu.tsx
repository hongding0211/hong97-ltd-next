'use client'

import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import { isIPhoneOrIPad } from '@utils/apple-touch-device'
import { useTranslation } from 'next-i18next'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  type InsertCommandItem,
  type InsertCommandRange,
  createInsertCommandItems,
} from './insert-command-items'

interface SlashCommandMenuProps {
  editor: Editor
}

interface SlashMatch {
  key: string
  query: string
  range: InsertCommandRange
}

interface MenuPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

const MENU_GAP = 8
const MENU_MAX_HEIGHT = 320
const MENU_MAX_WIDTH = 280

const findSlashMatch = (editor: Editor): SlashMatch | null => {
  if (!editor.isFocused || !editor.state.selection.empty) {
    return null
  }

  const { $from } = editor.state.selection
  if ($from.parent.type.name !== 'paragraph') {
    return null
  }

  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    '\ufffc',
  )
  const match = textBefore.match(/^\/([^\s/]*)$/)

  if (!match) {
    return null
  }

  const query = match[1]
  const to = editor.state.selection.from
  const from = to - query.length - 1

  return {
    key: `${from}:${to}:${query}`,
    query,
    range: { from, to, replaceBlock: true },
  }
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  editor,
}) => {
  const { t } = useTranslation('blog')
  const [appleTouchDevice, setAppleTouchDevice] = useState<boolean | null>(null)
  const [slashMatch, setSlashMatch] = useState<SlashMatch | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const dismissedKeyRef = useRef<string | null>(null)
  const items = useMemo(createInsertCommandItems, [])
  const filteredItems = useMemo(() => {
    const query = slashMatch?.query.toLowerCase() || ''
    if (!query) {
      return items
    }

    return items.filter((item) =>
      [item.label, ...item.keywords].join(' ').toLowerCase().includes(query),
    )
  }, [items, slashMatch?.query])

  const refreshMatch = useCallback(() => {
    if (appleTouchDevice !== false) {
      setSlashMatch(null)
      return
    }

    const nextMatch = findSlashMatch(editor)
    if (!nextMatch || nextMatch.key === dismissedKeyRef.current) {
      setSlashMatch(null)
      return
    }

    dismissedKeyRef.current = null
    setSelectedIndex(0)
    setSlashMatch((current) =>
      current?.key === nextMatch.key ? current : nextMatch,
    )
  }, [appleTouchDevice, editor])

  const updatePosition = useCallback(() => {
    if (!slashMatch) {
      setPosition(null)
      return
    }

    try {
      const viewport = window.visualViewport
      const viewportLeft = viewport?.offsetLeft ?? 0
      const viewportTop = viewport?.offsetTop ?? 0
      const viewportWidth = viewport?.width ?? window.innerWidth
      const viewportHeight = viewport?.height ?? window.innerHeight
      const viewportRight = viewportLeft + viewportWidth
      const viewportBottom = viewportTop + viewportHeight
      const caret = editor.view.coordsAtPos(slashMatch.range.from)
      const width = Math.min(MENU_MAX_WIDTH, viewportWidth - MENU_GAP * 2)
      const estimatedHeight = Math.min(
        MENU_MAX_HEIGHT,
        filteredItems.length * 40 + MENU_GAP,
      )
      const left = Math.min(
        Math.max(caret.left, viewportLeft + MENU_GAP),
        viewportRight - width - MENU_GAP,
      )
      const belowTop = caret.bottom + MENU_GAP
      const top =
        belowTop + estimatedHeight <= viewportBottom - MENU_GAP
          ? belowTop
          : Math.max(
              viewportTop + MENU_GAP,
              caret.top - estimatedHeight - MENU_GAP,
            )

      setPosition({ left, top, width, maxHeight: MENU_MAX_HEIGHT })
    } catch {
      setPosition(null)
    }
  }, [editor, filteredItems.length, slashMatch])

  const runItem = useCallback(
    (item: InsertCommandItem) => {
      if (!slashMatch) {
        return
      }

      dismissedKeyRef.current = null
      setSlashMatch(null)
      item.run(editor, slashMatch.range)
    },
    [editor, slashMatch],
  )

  useEffect(() => {
    setAppleTouchDevice(isIPhoneOrIPad())
  }, [])

  useEffect(() => {
    if (appleTouchDevice !== false) {
      return
    }

    editor.on('transaction', refreshMatch)
    editor.on('focus', refreshMatch)
    editor.on('blur', refreshMatch)
    refreshMatch()

    return () => {
      editor.off('transaction', refreshMatch)
      editor.off('focus', refreshMatch)
      editor.off('blur', refreshMatch)
    }
  }, [appleTouchDevice, editor, refreshMatch])

  useEffect(() => {
    if (!slashMatch) {
      return
    }

    updatePosition()
    const viewport = window.visualViewport
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    viewport?.addEventListener('resize', updatePosition)
    viewport?.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      viewport?.removeEventListener('resize', updatePosition)
      viewport?.removeEventListener('scroll', updatePosition)
    }
  }, [slashMatch, updatePosition])

  const slashMatchKey = slashMatch?.key
  const itemCount = filteredItems.length
  const selectedItem = filteredItems[selectedIndex] || filteredItems[0]

  useEffect(() => {
    if (!slashMatchKey) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dismissedKeyRef.current = slashMatchKey
        setSlashMatch(null)
        return
      }

      if (!itemCount) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((index) => (index + 1) % itemCount)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((index) => (index - 1 + itemCount) % itemCount)
      } else if (event.key === 'Enter' && selectedItem) {
        event.preventDefault()
        runItem(selectedItem)
      }
    }

    editor.view.dom.addEventListener('keydown', handleKeyDown)
    return () => editor.view.dom.removeEventListener('keydown', handleKeyDown)
  }, [editor, itemCount, runItem, selectedItem, slashMatchKey])

  if (
    appleTouchDevice !== false ||
    !slashMatch ||
    !filteredItems.length ||
    !position
  ) {
    return null
  }

  return createPortal(
    <div
      role="listbox"
      aria-label={t('edit.formatting.insertBlock')}
      className="fixed z-[140] overflow-y-auto rounded-lg border border-neutral-200 bg-white/95 p-1 shadow-lg backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95"
      style={position}
    >
      {filteredItems.map((item, index) => {
        const { Icon } = item
        const selected = index === selectedIndex

        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-neutral-700 dark:text-neutral-200',
              selected &&
                'bg-neutral-100 text-neutral-950 dark:bg-neutral-800 dark:text-white',
            )}
            onPointerDown={(event) => {
              event.preventDefault()
              runItem(item)
            }}
            onPointerEnter={() => setSelectedIndex(index)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
