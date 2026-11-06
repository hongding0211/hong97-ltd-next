// MDX preserves literal <img> tags unless they are promoted to a component.
module.exports = function remarkImages() {
  return function transform(tree) {
    function visit(node) {
      if (
        (node.type === 'mdxJsxFlowElement' ||
          node.type === 'mdxJsxTextElement') &&
        node.name === 'img'
      )
        node.name = 'MarkdownImage'
      for (const child of node.children || []) visit(child)
    }
    visit(tree)
  }
}
