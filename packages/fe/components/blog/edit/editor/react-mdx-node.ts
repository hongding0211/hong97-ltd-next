import {
  InputRule,
  Node,
  ReactNodeViewRenderer,
  mergeAttributes,
} from '@tiptap/react'
import MdxImage from './components/mdx-image'
import { createImagePastePlugin } from './image-paste-plugin'
import { ReactMdxNodeView } from './react-mdx-node-view'
import type { ComponentMapEntry, ReactMdxNodeAttrs } from './react-mdx-types'

/**
 * Register all custom MDX components here
 */
export const ComponentMap: Record<string, ComponentMapEntry> = {
  img: {
    component: MdxImage,
    displayName: 'MDX Image',
    defaultProps: {
      urls: '',
      caption: '',
      loop: false,
    },
  },
  /**
   * Following components are examples of lazy-loaded components
   */
  'lazy.wrapped25': {
    lazy: true,
    displayName: 'Wrapped25',
    defaultProps: {
      type: '0',
    },
    lazyLoader: () => import('../../lazy/wrapped25'),
  },
  'lazy.foo': {
    lazy: true,
    displayName: 'Lazy Foo',
    defaultProps: {
      message: 'Hello from Foo!',
      color: '#10b981',
    },
    lazyLoader: () => import('../../lazy/foo'),
  },
}

export const ReactMdxNode = Node.create({
  name: 'reactMdxNode',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: (element) => {
          return (
            element.getAttribute('data-name') || element.getAttribute('name')
          )
        },
        renderHTML: (attributes) => ({
          'data-name': attributes.name,
        }),
      },
      props: {
        default: '{}',
        parseHTML: (element) => {
          return (
            element.getAttribute('data-props') ||
            element.getAttribute('props') ||
            '{}'
          )
        },
        renderHTML: (attributes) => ({
          'data-props': attributes.props,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-react-mdx-node]',
      },
      {
        tag: 'ReactMdxComponent',
        getAttrs: (element) => {
          if (typeof element === 'string') return false

          const name = element.getAttribute('name')
          let props = element.getAttribute('props') || '{}'

          if (!name) return false

          try {
            JSON.parse(props)
          } catch {
            console.error('Invalid props JSON in ReactMdxComponent:', props)
            props = '{}'
          }

          const result = {
            name,
            props,
          }

          return result
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-react-mdx-node': 'true' }),
    ]
  },

  parseMarkdown() {
    return {
      block: 'reactMdxNode',
      getAttrs: (token: any) => {
        const content = token.content || token.markup || ''
        const match = content.match(
          /<ReactMdxComponent\s+name="([^"]+)"\s+props='([^']+)'\s*\/>/,
        )

        if (match) {
          return {
            name: match[1],
            props: match[2].replace(/\\'/g, "'"),
          }
        }

        return false
      },
    }
  },

  renderMarkdown(node) {
    const { name, props } = node.attrs as ReactMdxNodeAttrs

    const propsStr = props.replace(/'/g, "\\'")
    return `<ReactMdxComponent name="${name}" props='${propsStr}' />\n\n`
  },

  addInputRules() {
    return [
      new InputRule({
        find: /:::([a-zA-Z0-9._-]+)\s*$/,
        handler: ({ state, range, match }) => {
          const componentName = match[1]

          if (!ComponentMap[componentName]) {
            return null
          }

          const attrs: ReactMdxNodeAttrs = {
            name: componentName,
            props: JSON.stringify(
              ComponentMap[componentName].defaultProps || {},
            ),
          }

          const { tr } = state
          const $from = state.doc.resolve(range.from)
          const $to = state.doc.resolve(range.to)

          const nodeStart = $from.before()
          const nodeEnd = $to.after()

          tr.replaceRangeWith(nodeStart, nodeEnd, this.type.create(attrs))

          return tr
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [createImagePastePlugin(this.editor, this.type)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReactMdxNodeView)
  },
})
