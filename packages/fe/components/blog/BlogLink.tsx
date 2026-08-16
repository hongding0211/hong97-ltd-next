import type { AnchorHTMLAttributes } from 'react'

const SITE_HOSTNAME = 'hong97.ltd'

const isExternalHttpLink = (href?: string) => {
  if (!href) {
    return false
  }

  try {
    const url = new URL(href, `https://${SITE_HOSTNAME}`)
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
    const isSiteHostname =
      url.hostname === SITE_HOSTNAME ||
      url.hostname.endsWith(`.${SITE_HOSTNAME}`)

    return isHttp && !isSiteHostname
  } catch {
    return false
  }
}

const withSafeBlankRel = (rel?: string) => {
  const values = new Set(rel?.split(/\s+/).filter(Boolean))
  values.add('noopener')
  values.add('noreferrer')
  return Array.from(values).join(' ')
}

export const BlogLink = ({
  href,
  target,
  rel,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const resolvedTarget =
    target ?? (isExternalHttpLink(href) ? '_blank' : undefined)
  const resolvedRel = resolvedTarget === '_blank' ? withSafeBlankRel(rel) : rel

  return <a {...props} href={href} target={resolvedTarget} rel={resolvedRel} />
}
