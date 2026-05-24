export type BlogTocItem = {
  id: string
  title: string
  level: 1 | 2
}

type RawBlogTocItem = {
  id: string
  title: string
  level: 1 | 2 | 3 | 4
}

export function slugifyBlogHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function stripMarkdown(text: string) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~[\]()]/g, '')
    .trim()
}

export function normalizeBlogTocItems(items: RawBlogTocItem[]): BlogTocItem[] {
  if (!items.length) {
    return []
  }

  const topLevel = Math.min(...items.map((item) => item.level))
  const secondLevel = topLevel + 1
  let hasSeenTopLevel = false

  return items.flatMap((item) => {
    if (item.level === topLevel) {
      hasSeenTopLevel = true
      return [{ id: item.id, title: item.title, level: 1 }]
    }

    if (item.level === secondLevel) {
      return [
        {
          id: item.id,
          title: item.title,
          level: hasSeenTopLevel ? 2 : 1,
        },
      ]
    }

    return []
  })
}

export function addHeadingAnchors(markdown: string) {
  const usedSlugs = new Map<string, number>()
  const tocItems: RawBlogTocItem[] = []
  let inCodeBlock = false

  const content = markdown
    .split('\n')
    .map((line) => {
      if (/^```/.test(line.trim())) {
        inCodeBlock = !inCodeBlock
        return line
      }

      if (inCodeBlock) {
        return line
      }

      const match = line.match(/^(#{1,4})\s+(.+)$/)

      if (!match) {
        return line
      }

      const [, marks, rawTitle] = match
      const level = marks.length as RawBlogTocItem['level']
      const title = stripMarkdown(rawTitle)
      const baseSlug =
        slugifyBlogHeading(title) || `heading-${tocItems.length + 1}`
      const usedCount = usedSlugs.get(baseSlug) || 0
      const id = usedCount ? `${baseSlug}-${usedCount + 1}` : baseSlug

      usedSlugs.set(baseSlug, usedCount + 1)
      tocItems.push({ id, title, level })

      return `<h${level} id="${id}">${rawTitle}</h${level}>`
    })
    .join('\n')

  return { content, tocItems: normalizeBlogTocItems(tocItems) }
}
