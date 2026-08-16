type MarkdownNode = {
  type: string
  value?: string
  name?: string
  children?: MarkdownNode[]
  [key: string]: unknown
}

const markerNode = (): MarkdownNode => ({ type: 'underlineMarker' })

const splitUnderlineMarkers = (node: MarkdownNode): MarkdownNode[] => {
  if (node.type !== 'text' || !node.value?.includes('++')) {
    return [node]
  }

  const parts = node.value.split('++')
  const result: MarkdownNode[] = []

  parts.forEach((part, index) => {
    if (part) {
      result.push({ ...node, value: part })
    }
    if (index < parts.length - 1) {
      result.push(markerNode())
    }
  })

  return result
}

const wrapUnderlinePairs = (children: MarkdownNode[]): MarkdownNode[] => {
  const parts = children.flatMap(splitUnderlineMarkers)
  const result: MarkdownNode[] = []
  let underlined: MarkdownNode[] | null = null

  parts.forEach((part) => {
    if (part.type !== 'underlineMarker') {
      if (underlined) {
        underlined.push(part)
      } else {
        result.push(part)
      }
      return
    }

    if (!underlined) {
      underlined = []
      return
    }

    if (underlined.length) {
      result.push({
        type: 'mdxJsxTextElement',
        name: 'u',
        attributes: [],
        children: underlined,
      })
    } else {
      result.push({ type: 'text', value: '++++' })
    }
    underlined = null
  })

  if (underlined) {
    result.push({ type: 'text', value: '++' }, ...underlined)
  }

  return result
}

const transformNode = (node: MarkdownNode) => {
  if (!node.children?.length) {
    return
  }

  node.children.forEach(transformNode)
  node.children = wrapUnderlinePairs(node.children)
}

/** Render Tiptap's `++underline++` Markdown as semantic MDX `<u>` nodes. */
export const remarkUnderline = () => (tree: MarkdownNode) => {
  transformNode(tree)
}
