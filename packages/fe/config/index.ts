import { SquareArrowOutUpRight } from 'lucide-react'

export type IMenuItem = {
  key: string
  path: string
  externalLink?: boolean
  icon?: any
}

export type IFooterItem = {
  key: string
  title: string
  path: string
}

export const menuConfig: IMenuItem[] = [
  {
    key: 'about',
    path: '/about',
  },
  {
    key: 'blog',
    path: '/blog',
  },
  {
    key: 'tools',
    path: '/tools',
  },
  {
    key: 'cyberNeighbor',
    path: '/cyberNeighbor',
  },
  {
    key: 'doc',
    path: 'https://docs.hong97.ltd',
    externalLink: true,
    icon: SquareArrowOutUpRight,
  },
]

export const footerConfig: IFooterItem[] = [
  {
    key: 'collections',
    title: 'Collections',
    path: 'https://github.com/hongding0211/collections',
  },
  {
    key: 'walkingCalc',
    title: 'Walking Calculator',
    path: 'https://github.com/hongding0211/walkingcalc',
  },
]
