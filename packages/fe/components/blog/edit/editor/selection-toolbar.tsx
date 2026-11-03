'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type Editor, posToDOMRect } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { isMobileDevice } from '@utils/mobile-device'
import {
  WAVE_COLORS,
  type WaveColor,
  normalizeWaveColor,
} from '@utils/wavy-underline'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronLeft,
  Code2,
  Italic,
  Link2,
  Plus,
  Redo2,
  Underline,
  Undo2,
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
  mobileToolbarContainer: HTMLDivElement | null
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

interface VisualViewportBounds extends FloatingPosition {
  height: number
}

const getVisualViewportBounds = (): VisualViewportBounds => ({
  left: window.visualViewport?.offsetLeft ?? 0,
  top: window.visualViewport?.offsetTop ?? 0,
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
})

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

const WavyUnderlineIcon = ({ color = 'currentColor' }: { color?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M7 3v7a5 5 0 0 0 10 0V3" />
    <path d="M3 20c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
  </svg>
)

const ToolbarButton = ({
  active,
  activeColor,
  touch,
  disabled,
  label,
  onClick,
  onPointerDownAction,
  children,
}: {
  active?: boolean
  activeColor?: string
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
    style={
      active && activeColor
        ? { backgroundColor: `${activeColor}26` }
        : undefined
    }
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
  mobileToolbarContainer,
}) => {
  const { t } = useTranslation('blog')
  const [, setVersion] = useState(0)
  const [linkOpen, setLinkOpenState] = useState(false)
  const [href, setHref] = useState('')
  const [linkText, setLinkText] = useState('')
  const [canRemoveLink, setCanRemoveLink] = useState(false)
  const [floatingPosition, setFloatingPosition] =
    useState<FloatingPosition | null>(null)
  const [mobileDevice, setMobileDevice] = useState<boolean | null>(null)
  const [visualViewportBounds, setVisualViewportBounds] =
    useState<VisualViewportBounds | null>(null)
  const [toolbarLevel, setToolbarLevel] = useState<
    'formatting' | 'insert' | 'wave'
  >('formatting')
  const linkOpenRef = useRef(false)
  const selectionRef = useRef<SavedSelection | null>(null)
  const hrefInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const mobileLinkSheetRef = useRef<HTMLDivElement>(null)
  const insertCommandItems = useRef(createInsertCommandItems()).current

  usePageScrollLock(mobileDevice === true && linkOpen)

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

    if (mobileDevice === true) {
      flushSync(() => {
        setVisualViewportBounds(getVisualViewportBounds())
        setLinkOpen(true)
      })
      hrefInputRef.current?.focus({ preventScroll: true })
      return
    }

    setLinkOpen(true)

    if (!hasText) {
      requestAnimationFrame(updateFloatingPosition)
    }
    requestAnimationFrame(() => hrefInputRef.current?.focus())
  }, [mobileDevice, editor, setLinkOpen, updateFloatingPosition])

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
    setMobileDevice(isMobileDevice())
  }, [])

  useEffect(() => {
    if (mobileDevice !== true || !linkOpen) {
      setVisualViewportBounds(null)
      return
    }

    const viewport = window.visualViewport

    const updateVisualViewport = () => {
      setVisualViewportBounds(getVisualViewportBounds())
    }

    updateVisualViewport()
    const delayedUpdate = window.setTimeout(updateVisualViewport, 300)
    let orientationUpdate: number | undefined
    const handleOrientationChange = () => {
      orientationUpdate = window.setTimeout(updateVisualViewport, 300)
    }

    viewport?.addEventListener('resize', updateVisualViewport)
    viewport?.addEventListener('scroll', updateVisualViewport)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.clearTimeout(delayedUpdate)
      window.clearTimeout(orientationUpdate)
      viewport?.removeEventListener('resize', updateVisualViewport)
      viewport?.removeEventListener('scroll', updateVisualViewport)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [mobileDevice, linkOpen])

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
    if (!linkOpen || mobileDevice === true) {
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
  }, [mobileDevice, closeLink, linkOpen])

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

  const switchToolbarLevel = (level: 'formatting' | 'insert' | 'wave') => {
    flushSync(() => setToolbarLevel(level))
  }

  const renderFormattingControls = (touch = false) => (
    <>
      {touch && (
        <>
          <div
            role="group"
            aria-label={t('edit.formatting.history')}
            className="flex shrink-0 items-center gap-0.5"
          >
            <ToolbarButton
              touch
              label={t('edit.formatting.undo')}
              disabled={!editor.isEditable || !editor.can().undo()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              touch
              label={t('edit.formatting.redo')}
              disabled={!editor.isEditable || !editor.can().redo()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
          <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
          <ToolbarButton
            touch
            label={t('edit.formatting.insertBlock')}
            onClick={() => switchToolbarLevel('insert')}
            onPointerDownAction={() => switchToolbarLevel('insert')}
          >
            <Plus className="h-4 w-4" />
          </ToolbarButton>
        </>
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
        onClick={() =>
          editor.chain().focus().unsetWavyUnderline().toggleUnderline().run()
        }
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      <ToolbarButton
        touch={touch}
        active={editor.isActive('wavyUnderline')}
        label={t('edit.formatting.wavyUnderline')}
        onClick={() => switchToolbarLevel('wave')}
      >
        <WavyUnderlineIcon
          color={
            editor.isActive('wavyUnderline')
              ? WAVE_COLORS[
                  normalizeWaveColor(
                    editor.getAttributes('wavyUnderline').color,
                  )
                ]
              : undefined
          }
        />
      </ToolbarButton>
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
          !editor.isActive({ textAlign: 'left' }) &&
          !editor.isActive({ textAlign: 'center' }) &&
          !editor.isActive({ textAlign: 'right' })
        }
        label={t('edit.formatting.alignJustify')}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        touch={touch}
        active={editor.isActive({ textAlign: 'left' })}
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

  const renderWaveControls = (touch = false) => (
    <>
      <ToolbarButton
        touch={touch}
        label={t('edit.formatting.backToFormatting')}
        onClick={() => switchToolbarLevel('formatting')}
      >
        <ChevronLeft className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
      {(Object.keys(WAVE_COLORS) as WaveColor[]).map((color) => (
        <ToolbarButton
          key={color}
          touch={touch}
          active={editor.isActive('wavyUnderline', { color })}
          activeColor={WAVE_COLORS[color]}
          label={t(`edit.formatting.waveColors.${color}`)}
          onClick={() => {
            if (editor.isActive('wavyUnderline', { color })) {
              editor.chain().focus().unsetWavyUnderline().run()
            } else {
              editor.chain().focus().setWavyUnderline(color).run()
            }
          }}
        >
          <WavyUnderlineIcon color={WAVE_COLORS[color]} />
        </ToolbarButton>
      ))}
    </>
  )

  const renderFormattingToolbar = () => (
    <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/95 p-1 shadow-lg backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/95">
      {toolbarLevel === 'wave'
        ? renderWaveControls()
        : renderFormattingControls()}
    </div>
  )

  const renderInsertControls = () => (
    <>
      <div className="sticky left-0 z-10 flex shrink-0 items-center bg-white/95 pr-0.5 dark:bg-neutral-950/95">
        <ToolbarButton
          touch
          label={t('edit.formatting.backToFormatting')}
          onClick={() => switchToolbarLevel('formatting')}
          onPointerDownAction={() => switchToolbarLevel('formatting')}
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
              setToolbarLevel('formatting')
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
      {mobileDevice === false && (
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
        mobileDevice === false &&
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

      {mobileDevice === true &&
        mobileToolbarContainer &&
        createPortal(
          <div
            role={toolbarLevel === 'insert' ? 'listbox' : 'toolbar'}
            aria-label={
              toolbarLevel === 'insert'
                ? t('edit.formatting.insertBlock')
                : toolbarLevel === 'wave'
                  ? t('edit.formatting.wavyUnderline')
                  : undefined
            }
            className="flex w-full items-center gap-0.5 overflow-x-auto overscroll-x-contain"
          >
            {toolbarLevel === 'insert'
              ? renderInsertControls()
              : toolbarLevel === 'wave'
                ? renderWaveControls(true)
                : renderFormattingControls(true)}
          </div>,
          mobileToolbarContainer,
        )}

      {mobileDevice === true &&
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
