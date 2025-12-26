import {
  InputRule,
  Node,
  ReactNodeViewRenderer,
  mergeAttributes,
} from '@tiptap/react'
import { DemoComponent } from './components/demo-component'
import { ReactMdxNodeView } from './react-mdx-node-view'
import type { ComponentMapEntry, ReactMdxNodeAttrs } from './react-mdx-types'

/**
 * Register all custom MDX components here
 */
export const ComponentMap: Record<string, ComponentMapEntry> = {
  'x.demo': {
    component: DemoComponent,
    displayName: 'Demo Component',
    defaultProps: {
      title: 'Demo Title',
      description: 'Demo Description',
      color: '#3b82f6',
    },
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
        parseHTML: (element) => element.getAttribute('data-name'),
        renderHTML: (attributes) => ({
          'data-name': attributes.name,
        }),
      },
      props: {
        default: '{}',
        parseHTML: (element) => element.getAttribute('data-props') || '{}',
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
          const props = element.getAttribute('props')

          if (!name) return false

          return {
            name,
            props: props || '{}',
          }
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
          const start = range.from
          const end = range.to

          tr.delete(start, end).insert(start, this.type.create(attrs))

          return tr
        },
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReactMdxNodeView)
  },
})
