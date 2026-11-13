import MdxImage from './edit/editor/components/mdx-image'
import type { ComponentMapEntry } from './react-mdx-types'

/**
 * Components supported by both published MDX and the blog editor.
 * Keep this registry independent from Tiptap node and NodeView modules.
 */
export const ComponentMap: Record<string, ComponentMapEntry> = {
  img: {
    component: MdxImage,
    displayName: 'Image',
    defaultProps: {
      urls: '',
      caption: '',
      loop: false,
    },
  },
  'lazy.summary24': {
    lazy: true,
    displayName: '2024 Summary',
    defaultProps: { type: 'TLDR' },
    lazyLoader: () => import('./lazy/summary24'),
  },
  'lazy.livePhoto': {
    lazy: true,
    displayName: 'Live Photo',
    defaultProps: { images: [] },
    lazyLoader: () => import('./lazy/livePhoto'),
  },
  'lazy.wrapped25': {
    lazy: true,
    displayName: 'Wrapped25',
    defaultProps: {
      type: '0',
    },
    lazyLoader: () => import('./lazy/wrapped25'),
  },
  'lazy.foo': {
    lazy: true,
    displayName: 'Lazy Foo',
    defaultProps: {
      message: 'Hello from Foo!',
      color: '#10b981',
    },
    lazyLoader: () => import('./lazy/foo'),
  },
}
