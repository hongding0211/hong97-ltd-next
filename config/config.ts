export type IMenuItem = {
  key: string
  path: string
  externalLink?: boolean
}

export type IFooterItem = {
  key: string
  title: string
  path: string
}

export const menuConfig: IMenuItem[] = [
  {
    key: 'doc',
    path: 'https://docs.hong97.ltd',
    externalLink: true,
  },
  {
    key: 'about',
    path: '/about',
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
