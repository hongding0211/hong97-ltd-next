import { Extension } from '@tiptap/core'
import { Plugin, TextSelection } from '@tiptap/pm/state'
import { isIPhoneOrIPad } from '@utils/apple-touch-device'

// ProseMirror handles iOS Enter asynchronously, with a 200ms fallback.
const NATIVE_PARAGRAPH_WINDOW_MS = 250

export const NativeParagraphScroll = Extension.create({
  name: 'nativeParagraphScroll',

  addProseMirrorPlugins() {
    let paragraphInputAt: number | null = null

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            beforeinput: (_view, event) => {
              const { inputType } = event as InputEvent
              if (
                isIPhoneOrIPad() &&
                (inputType === 'insertParagraph' ||
                  inputType === 'insertLineBreak')
              ) {
                paragraphInputAt = performance.now()
              } else {
                paragraphInputAt = null
              }
              return false
            },
          },
          handleScrollToSelection: (view) => {
            const inputAt = paragraphInputAt
            paragraphInputAt = null
            if (
              inputAt === null ||
              performance.now() - inputAt > NATIVE_PARAGRAPH_WINDOW_MS
            ) {
              return false
            }

            const viewport = window.visualViewport
            if (
              !view.hasFocus() ||
              !(view.state.selection instanceof TextSelection) ||
              !view.state.selection.empty ||
              !viewport ||
              Math.abs(viewport.scale - 1) > 0.01 ||
              viewport.height >= window.innerHeight
            ) {
              return false
            }

            // Safari already scrolls its native paragraph input. A second
            // window.scrollBy here makes its keyboard viewport jump again.
            return true
          },
        },
      }),
    ]
  },
})
