'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type Editor, posToDOMRect } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { isIPhoneOrIPad } from '@utils/apple-touch-device'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronLeft,
  Code2,
  Italic,
  Link2,
  Plus,
  Underline,
  Unlink,
  X,
} from 'lucide-react'
import { useTranslation } from 'next-i18next'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { createInsertCommandItems } from './insert-command-items'
import { usePageScrollLock } from './use-page-scroll-lock'

interface SelectionToolbarProps {
  editor: Editor
}

interface SavedSelection {
  from: number
  to: number
  hasText: boolean
}

interface FloatingPosition {
  left: number
  top: number
  width: number
}

type KeyboardDockPosition = FloatingPosition

interface VisualViewportBounds extends FloatingPosition {
  height: number
}

const KEYBOARD_DOCK_GAP = 8
const KEYBOARD_DOCK_SIDE_INSET = 4

const normalizeHref = (value: string) => {
  const href = value.trim()

  if (
    /^(https?:\/\/|mailto:|tel:)/i.test(href) ||
    /^(\/|#|\.\/|\.\.\/)/.test(href)
  ) {
    return href
  }

  return `https://${href}`
}

const ToolbarButton = ({
  active,
  touch,
  disabled,
  label,
  onClick,
  onPointerDownAction,
  children,
}: {
  active?: boolean
  touch?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  onPointerDownAction?: () => void
  children: React.ReactNode
}) => (
  <Button
    type="button"
    variant="ghost"
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    title={label}
    onPointerDown={(event) => {
      event.preventDefault()
      onPointerDownAction?.()
    }}
    onClick={onClick}
    className={cn(
      'h-10 w-10 shrink-0 p-0 sm:h-8 sm:w-8',
      touch && 'h-10 w-10 sm:h-10 sm:w-10',
      active &&
        'bg-neutral-200 text-neutral-950 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-50 dark:hover:bg-neutral-800',
    )}
  >
    {children}
  </Button>
)

const LinkFields = ({
  surface = 'floating',
  hasText,
  href,
  text,
  canRemove,
  hrefInputRef,
  formRef,
  onHrefChange,
  onTextChange,
  onApply,
  onRemove,
  onCancel,
}: {
  surface?: 'floating' | 'sheet'
  hasText: boolean
  href: string
  text: string
  canRemove: boolean
  hrefInputRef: React.RefObject<HTMLInputElement>
  formRef: React.RefObject<HTMLFormElement>
  onHrefChange: (value: string) => void
  onTextChange: (value: string) => void
  onApply: () => void
  onRemove: () => void
  onCancel: () => void
}) => {
  const { t } = useTranslation('blog')
  const textInput = !hasText ? (
    <Input
      value={text}
      onChange={(event) => onTextChange(event.target.value)}
      aria-label={t('edit.formatting.linkText')}
      placeholder={t('edit.formatting.linkTextPlaceholder')}
      className={cn(
        'h-9 min-w-0 px-2.5 text-base sm:text-sm',
        surface === 'sheet' && 'h-11 rounded-xl px-3 sm:text-base',
      )}
    />
  ) : null
  const hrefInput = (
    <Input
      ref={hrefInputRef}
      value={href}
      onChange={(event) => onHrefChange(event.target.value)}
      aria-label={t('edit.formatting.linkUrl')}
      placeholder={t('edit.formatting.linkUrlPlaceholder')}
      inputMode="url"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      className={cn(
        'h-9 min-w-0 px-2.5 text-base sm:text-sm',
        surface === 'sheet' && 'h-11 rounded-xl px-3 sm:text-base',
      )}
    />
  )
  const actions = (
    <>
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={!href.trim()}
        aria-label={t('edit.formatting.applyLink')}
        title={t('edit.formatting.applyLink')}
        className={cn(
          'ml-1 h-9 w-9 shrink-0',
          surface === 'sheet' && 'ml-0 h-11 w-11',
        )}
      >
        <Check className="h-4 w-4" />
      </Button>
      {canRemove && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={t('edit.formatting.removeLink')}
          title={t('edit.formatting.removeLink')}
          onClick={onRemove}
          className={cn('h-9 w-9 shrink-0', surface === 'sheet' && 'h-11 w-11')}
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={t('edit.formatting.cancelLink')}
        title={t('edit.formatting.cancelLink')}
        onClick={onCancel}
        className={cn('h-9 w-9 shrink-0', surface === 'sheet' && 'h-11 w-11')}
      >
        <X className="h-4 w-4" />
      </Button>
    </>
  )

  return (
    <form
      ref={formRef}
      className={cn(
        'flex flex-col gap-1.5',
        surface === 'floating'
          ? 'w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-neutral-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95'
          : 'w-full gap-3',
      )}
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
    >
      {surface === 'sheet' ? (
        <>
          {hrefInput}
          <div className="flex items-center gap-2">
            {textInput}
            <div className="flex shrink-0 items-center gap-1">{actions}</div>
          </div>
        </>
      ) : (
        <>
          {textInput}
          <div className="flex items-center gap-1">
            {hrefInput}
            {actions}
          </div>
        </>
      )}
    </form>
  )
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  editor,
}) => {
  const { t } = useTranslation('blog')
  const [, setVersion] = useState(0)
  const [linkOpen, setLinkOpenState] = useState(false)
  const [href, setHref] = useState('')
  const [linkText, setLinkText] = useState('')
  const [canRemoveLink, setCanRemoveLink] = useState(false)
  const [floatingPosition, setFloatingPosition] =
    useState<FloatingPosition | null>(null)
  const [appleTouchDevice, setAppleTouchDevice] = useState<boolean | null>(null)
  const [editorFocused, setEditorFocused] = useState(editor.isFocused)
  const [keyboardDockPosition, setKeyboardDockPosition] =
    useState<KeyboardDockPosition | null>(null)
  const [visualViewportBounds, setVisualViewportBounds] =
    useState<VisualViewportBounds | null>(null)
  const [touchToolbarLevel, setTouchToolbarLevel] = useState<
    'formatting' | 'insert'
  >('formatting')
  const linkOpenRef = useRef(false)
  const selectionRef = useRef<SavedSelection | null>(null)
  const hrefInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const mobileLinkSheetRef = useRef<HTMLDivElement>(null)
  const insertCommandItems = useRef(createInsertCommandItems()).current

  usePageScrollLock(appleTouchDevice === true && linkOpen)

  const setLinkOpen = useCallback((open: boolean) => {
    linkOpenRef.current = open
    setLinkOpenState(open)
  }, [])

  const restoreSelection = useCallback(() => {
    const selection = selectionRef.current
    if (!selection) {
      return editor.chain().focus()
    }
    return editor
      .chain()
      .focus()
      .setTextSelection({ from: selection.from, to: selection.to })
  }, [editor])

  const closeLink = useCallback(
    (restoreFocus = true) => {
      setLinkOpen(false)
      setFloatingPosition(null)
      if (restoreFocus) {
        requestAnimationFrame(() => restoreSelection().run())
      }
    },
    [restoreSelection, setLinkOpen],
  )

  const updateFloatingPosition = useCallback(() => {
    const selection = selectionRef.current
    if (!selection || selection.hasText) {
      setFloatingPosition(null)
      return
    }

    try {
      const rect = posToDOMRect(editor.view, selection.from, selection.to)
      const viewportPadding = 12
      const width = Math.min(320, window.innerWidth - viewportPadding * 2)
      const centeredLeft = rect.left + rect.width / 2 - width / 2
      const left = Math.min(
        Math.max(centeredLeft, viewportPadding),
        window.innerWidth - width - viewportPadding,
      )
      const estimatedHeight = 92
      const top =
        rect.top - estimatedHeight - 8 >= viewportPadding
          ? rect.top - estimatedHeight - 8
          : rect.bottom + 8

      setFloatingPosition({ left, top, width })
    } catch {
      setFloatingPosition(null)
    }
  }, [editor])

  const openLink = useCallback(() => {
    if (linkOpenRef.current) {
      hrefInputRef.current?.focus()
      return
    }

    if (editor.isActive('codeBlock')) {
      return
    }

    const existingHref = String(editor.getAttributes('link').href || '')
    if (existingHref) {
      editor.chain().focus().extendMarkRange('link').run()
    }

    const { from, to } = editor.state.selection
    const hasText = from !== to
    selectionRef.current = { from, to, hasText }
    setHref(existingHref)
    setLinkText(hasText ? editor.state.doc.textBetween(from, to, ' ') : '')
    setCanRemoveLink(Boolean(existingHref))

    if (appleTouchDevice === true) {
      flushSync(() => setLinkOpen(true))
      hrefInputRef.current?.focus({ preventScroll: true })
      return
    }

    setLinkOpen(true)

    if (!hasText) {
      requestAnimationFrame(updateFloatingPosition)
    }
    requestAnimationFrame(() => hrefInputRef.current?.focus())
  }, [appleTouchDevice, editor, setLinkOpen, updateFloatingPosition])

  const applyLink = useCallback(() => {
    const selection = selectionRef.current
    const rawHref = href.trim()
    if (!selection || !rawHref) {
      return
    }

    const normalizedHref = normalizeHref(rawHref)
    if (selection.hasText) {
      restoreSelection().setLink({ href: normalizedHref }).run()
    } else {
      const label = linkText.trim() || rawHref
      restoreSelection()
        .insertContent({
          type: 'text',
          text: label,
          marks: [{ type: 'link', attrs: { href: normalizedHref } }],
        })
        .run()
    }
    closeLink(false)
  }, [closeLink, href, linkText, restoreSelection])

  const removeLink = useCallback(() => {
    restoreSelection().unsetLink().run()
    closeLink(false)
  }, [closeLink, restoreSelection])

  useEffect(() => {
    const update = () => setVersion((version) => version + 1)
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  useEffect(() => {
    setAppleTouchDevice(isIPhoneOrIPad())
  }, [])

  useEffect(() => {
    const handleFocus = () => setEditorFocused(true)
    const handleBlur = () => setEditorFocused(false)

    setEditorFocused(editor.isFocused)
    editor.on('focus', handleFocus)
    editor.on('blur', handleBlur)
    return () => {
      editor.off('focus', handleFocus)
      editor.off('blur', handleBlur)
    }
  }, [editor])

  useEffect(() => {
    if (appleTouchDevice !== true || (!editorFocused && !linkOpen)) {
      setKeyboardDockPosition(null)
      setVisualViewportBounds(null)
      return
    }

    const viewport = window.visualViewport

    const updateKeyboardDock = () => {
      const viewportHeight = viewport?.height ?? window.innerHeight
      const viewportOffsetTop = viewport?.offsetTop ?? 0
      const viewportOffsetLeft = viewport?.offsetLeft ?? 0
      const viewportWidth = viewport?.width ?? window.innerWidth
      const visibleBottom = viewportOffsetTop + viewportHeight

      setVisualViewportBounds({
        left: viewportOffsetLeft,
        top: viewportOffsetTop,
        width: viewportWidth,
        height: viewportHeight,
      })

      setKeyboardDockPosition({
        left: viewportOffsetLeft + KEYBOARD_DOCK_SIDE_INSET,
        top: visibleBottom - KEYBOARD_DOCK_GAP,
        width: viewportWidth - KEYBOARD_DOCK_SIDE_INSET * 2,
      })
    }

    updateKeyboardDock()
    const delayedUpdate = window.setTimeout(updateKeyboardDock, 300)
    let orientationUpdate: number | undefined
    const handleOrientationChange = () => {
      orientationUpdate = window.setTimeout(updateKeyboardDock, 300)
    }

    viewport?.addEventListener('resize', updateKeyboardDock)
    viewport?.addEventListener('scroll', updateKeyboardDock)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.clearTimeout(delayedUpdate)
      window.clearTimeout(orientationUpdate)
      viewport?.removeEventListener('resize', updateKeyboardDock)
      viewport?.removeEventListener('scroll', updateKeyboardDock)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [appleTouchDevice, editorFocused, linkOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openLink()
      }
    }

    editor.view.dom.addEventListener('keydown', handleKeyDown)
    return () => editor.view.dom.removeEventListener('keydown', handleKeyDown)
  }, [editor, openLink])

  useEffect(() => {
    if (!linkOpen || selectionRef.current?.hasText) {
      return
    }

    updateFloatingPosition()
    window.addEventListener('scroll', updateFloatingPosition, true)
    window.addEventListener('resize', updateFloatingPosition)
    return () => {
      window.removeEventListener('scroll', updateFloatingPosition, true)
      window.removeEventListener('resize', updateFloatingPosition)
    }
  }, [linkOpen, updateFloatingPosition])

  useEffect(() => {
    if (!linkOpen || appleTouchDevice === true) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !formRef.current?.contains(target) &&
        !mobileLinkSheetRef.current?.contains(target)
      ) {
        closeLink(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [appleTouchDevice, closeLink, linkOpen])

  useEffect(() => {
    const handleBlur = () => {
      window.setTimeout(() => {
        if (
          linkOpenRef.current &&
          !formRef.current?.contains(document.activeElement) &&
          !mobileLinkSheetRef.current?.contains(document.activeElement)
        ) {
          closeLink(false)
        }
      })
    }

    editor.on('blur', handleBlur)
    return () => {
      editor.off('blur', handleBlur)
    }
  }, [closeLink, editor])

  const savedSelection = selectionRef.current
  const renderLinkFields = (surface: 'floating' | 'sheet' = 'floating') =>
    savedSelection ? (
      <LinkFields
        surface={surface}
        hasText={savedSelection.hasText}
        href={href}
        text={linkText}
        canRemove={canRemoveLink}
        hrefInputRef={hrefInputRef}
        formRef={formRef}
        onHrefChange={setHref}
        onTextChange={setLinkText}
        onApply={applyLink}
        onRemove={removeLink}
        onCancel={() => closeLink()}
      />
    ) : null

  const linkFields = renderLinkFields()

  const switchTouchToolbarLevel = (level: 'formatting' | 'insert') => {
    flushSync(() => setTouchToolbarLevel(level))
    editor.view.focus()
  }

  const renderFormattingControls = (touch = false) => (
    <>
      {touch && (
        <ToolbarButton
          touch
          label={t('edit.formatting.insertBlock')}
          onClick={() => switchTouchToolbarLevel('insert')}
          onPointerDownAction={() => switchTouchToolbarLevel('insert')}
        >
          <Plus className="h-4 w-4" />
        </ToolbarButton>
      )}
      <ToolbarButton
        touch={touch}
        active={editor.isActive('bold')}
        label={t('edit.formatting.bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        touch={touch}
        active={editor.isActive('italic')}
        label={t('edit.formatting.italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        touch={touch}
        active={editor.isActive('underline')}
        label={t('edit.formatting.underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      <ToolbarButton
        touch={touch}
        active={editor.isActive('code')}
        label={t('edit.formatting.inlineCode')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        touch={touch}
        active={editor.isActive('link')}
        label={t('edit.formatting.link')}
        onClick={openLink}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      <ToolbarButton
        touch={touch}
        active={
          !editor.isActive({ textAlign: 'center' }) &&
          !editor.isActive({ textAlign: 'right' })
        }
        label={t('edit.formatting.alignLeft')}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        touch={touch}
        active={editor.isActive({ textAlign: 'center' })}
        label={t('edit.formatting.alignCenter')}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        touch={touch}
        active={editor.isActive({ textAlign: 'right' })}
        label={t('edit.formatting.alignRight')}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
    </>
  )

  const renderFormattingToolbar = () => (
    <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/95 p-1 shadow-lg backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95">
      {renderFormattingControls()}
    </div>
  )

  const renderInsertControls = () => (
    <>
      <div className="sticky left-0 z-10 flex shrink-0 items-center bg-white/95 pr-0.5 dark:bg-neutral-950/95">
        <ToolbarButton
          touch
          label={t('edit.formatting.backToFormatting')}
          onClick={() => switchTouchToolbarLevel('formatting')}
          onPointerDownAction={() => switchTouchToolbarLevel('formatting')}
        >
          <ChevronLeft className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      {insertCommandItems.map((item) => {
        const { Icon } = item
        return (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            role="option"
            aria-label={item.label}
            title={item.label}
            className="h-10 w-10 shrink-0 p-0"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              const position = editor.state.selection.from
              setTouchToolbarLevel('formatting')
              item.run(editor, { from: position, to: position })
            }}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </Button>
        )
      })}
    </>
  )

  return (
    <>
      {appleTouchDevice === false && (
        <BubbleMenu
          editor={editor}
          pluginKey="blogSelectionToolbar"
          updateDelay={100}
          appendTo={() => document.body}
          options={{
            strategy: 'fixed',
            placement: 'top',
            offset: 8,
            flip: { fallbackPlacements: ['bottom'] },
            shift: { padding: 8 },
            inline: true,
          }}
          shouldShow={({ element, state, view, from, to }) => {
            if (linkOpenRef.current && selectionRef.current?.hasText) {
              return true
            }
            const hasFocus =
              view.hasFocus() || element.contains(document.activeElement)
            const selectedText = state.doc.textBetween(from, to, ' ').trim()
            return (
              hasFocus &&
              from !== to &&
              Boolean(selectedText) &&
              !editor.isActive('codeBlock')
            )
          }}
        >
          {linkOpen && savedSelection?.hasText
            ? linkFields
            : renderFormattingToolbar()}
        </BubbleMenu>
      )}

      {linkOpen &&
        appleTouchDevice === false &&
        !savedSelection?.hasText &&
        floatingPosition &&
        createPortal(
          <div
            className="fixed z-[120]"
            style={{
              left: floatingPosition.left,
              top: floatingPosition.top,
              width: floatingPosition.width,
            }}
          >
            {linkFields}
          </div>,
          document.body,
        )}

      {appleTouchDevice === true &&
        !linkOpen &&
        keyboardDockPosition &&
        createPortal(
          <div
            className="fixed z-[130] flex justify-start"
            style={{
              left: keyboardDockPosition.left,
              top: keyboardDockPosition.top,
              width: keyboardDockPosition.width,
              transform: 'translateY(-100%)',
            }}
          >
            <div
              role={touchToolbarLevel === 'insert' ? 'listbox' : 'toolbar'}
              aria-label={
                touchToolbarLevel === 'insert'
                  ? t('edit.formatting.insertBlock')
                  : undefined
              }
              className="flex w-full items-center justify-start gap-0.5 overflow-x-auto rounded-[4px] border border-neutral-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95"
            >
              {touchToolbarLevel === 'insert'
                ? renderInsertControls()
                : renderFormattingControls(true)}
            </div>
          </div>,
          document.body,
        )}

      {appleTouchDevice === true &&
        linkOpen &&
        visualViewportBounds &&
        createPortal(
          <div
            className="fixed z-[140]"
            style={{
              left: visualViewportBounds.left,
              top: visualViewportBounds.top,
              width: visualViewportBounds.width,
              height: visualViewportBounds.height,
            }}
          >
            <button
              type="button"
              aria-label={t('edit.formatting.cancelLink')}
              className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
              onClick={() => closeLink()}
            />
            <div
              ref={mobileLinkSheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('edit.formatting.link')}
              className="absolute bottom-1 left-1/2 w-[min(calc(100%-1rem),32rem)] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <div className="mb-2 flex h-9 items-center text-sm font-medium">
                {t('edit.formatting.link')}
              </div>
              {renderLinkFields('sheet')}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
