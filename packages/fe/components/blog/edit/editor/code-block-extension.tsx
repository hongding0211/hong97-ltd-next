import type { NodeViewRendererProps } from '@tiptap/core'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import {
  getCodeLanguageOptions,
  normalizeCodeLanguage,
} from '../../code-language'

const setLanguageOptions = (select: HTMLSelectElement, language: string) => {
  const languages = getCodeLanguageOptions(language)

  select.replaceChildren(
    ...languages.map(({ value, label }) => {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      return option
    }),
  )
  select.value = normalizeCodeLanguage(language)
}

const createCodeBlockNodeView = ({
  node,
  editor,
  getPos,
}: NodeViewRendererProps) => {
  let currentNode = node
  let currentLanguage = String(node.attrs.language || 'plaintext')

  const dom = document.createElement('div')
  dom.className = 'blog-code-block relative my-5'

  const languageControl = document.createElement('div')
  languageControl.contentEditable = 'false'
  languageControl.className = 'absolute left-2 top-2 z-10'

  const select = document.createElement('select')
  select.setAttribute(
    'aria-label',
    document.documentElement.lang.startsWith('cn')
      ? '代码语言'
      : 'Code language',
  )
  select.className =
    'h-7 rounded-md border border-[#d8dee9] bg-[#e5e9f0] px-2.5 py-0 text-xs font-medium text-[#4c566a] outline-none transition-colors focus:border-[#81a1c1] focus:ring-1 focus:ring-[#81a1c1] dark:border-[#4c566a] dark:bg-[#3b4252] dark:text-[#d8dee9]'
  setLanguageOptions(select, currentLanguage)
  languageControl.append(select)

  const pre = document.createElement('pre')
  pre.className = `hljs language-${currentLanguage} !m-0 overflow-x-auto !rounded-lg !pt-11`

  const code = document.createElement('code')
  pre.append(code)
  dom.append(languageControl, pre)

  const handleLanguageChange = () => {
    const position = getPos()

    if (typeof position !== 'number') {
      return
    }

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(position, undefined, {
        ...currentNode.attrs,
        language: select.value,
      }),
    )
  }

  select.addEventListener('change', handleLanguageChange)

  return {
    dom,
    contentDOM: code,
    update(updatedNode: typeof node) {
      if (updatedNode.type !== currentNode.type) {
        return false
      }

      currentNode = updatedNode
      const updatedLanguage = String(updatedNode.attrs.language || 'plaintext')

      if (updatedLanguage !== currentLanguage) {
        currentLanguage = updatedLanguage
        setLanguageOptions(select, currentLanguage)
        pre.className = `hljs language-${currentLanguage} !m-0 overflow-x-auto !rounded-lg !pt-11`
      }

      return true
    },
    stopEvent(event: Event) {
      return languageControl.contains(event.target as globalThis.Node)
    },
    ignoreMutation(mutation: MutationRecord) {
      return languageControl.contains(mutation.target)
    },
    destroy() {
      select.removeEventListener('change', handleLanguageChange)
    },
  }
}

export const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return createCodeBlockNodeView
  },
})
